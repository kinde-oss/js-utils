import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { base64UrlEncode } from "../../utils/base64UrlEncode";
import { parseWwwAuthenticate } from "../discovery";
import { jsonResponse, mockFetch, serverMetadata } from "../testUtils";
import { createResourceServerConfig } from "./config";
import { adminRevoke } from "./revoke";
import {
  createAuthorizationServerMirrorHandler,
  createProtectedResourceMetadataHandler,
  createUnauthorizedResponse,
} from "./routes";
import {
  authenticateRequest,
  hasPermission,
  verifyAccessToken,
} from "./verify";

const issuer = "https://auth.example.com";
const resource = "https://api.example.com/mcp";
const metadataUrl =
  "https://api.example.com/.well-known/oauth-protected-resource/mcp";

const introspectionConfig = (fetch?: typeof globalThis.fetch) =>
  createResourceServerConfig({
    issuer,
    resource,
    clientId: "srv",
    clientSecret: "secret",
    scopes: ["read", "openid"],
    fetch,
  });

const activeClaims = {
  active: true,
  iss: issuer,
  aud: [resource],
  sub: "kp_1",
  client_id: "agent1",
  scope: "read write",
  permissions: ["read:data"],
  exp: Math.floor(Date.now() / 1000) + 600,
};

const bearer = (token: string) =>
  new Request(resource, { headers: { Authorization: `Bearer ${token}` } });

const formBody = (init: RequestInit) =>
  Object.fromEntries(new URLSearchParams(init.body as string));

describe("createResourceServerConfig", () => {
  it("derives endpoints and defaults", () => {
    expect(introspectionConfig()).toMatchObject({
      issuer,
      resource,
      scopes: ["read"],
      audience: [resource],
      verification: "introspection",
      resourceMetadataUrl: metadataUrl,
      resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
      introspectionEndpoint: `${issuer}/oauth2/introspect`,
      revocationEndpoint: `${issuer}/oauth2/revoke`,
      jwksUri: `${issuer}/.well-known/jwks`,
    });
  });

  it("requires client credentials for introspection only", () => {
    expect(() => createResourceServerConfig({ issuer, resource })).toThrow(
      "missing_client_credentials",
    );
    expect(() =>
      createResourceServerConfig({ issuer, resource, verification: "local" }),
    ).not.toThrow();
  });

  it("rejects insecure urls", () => {
    expect(() =>
      createResourceServerConfig({
        issuer: "http://auth.example.com",
        resource,
        verification: "local",
      }),
    ).toThrow("must use https");
  });
});

describe("routes", () => {
  it("serves protected resource metadata", async () => {
    const handler = createProtectedResourceMetadataHandler(
      introspectionConfig(),
    );
    expect(await handler().json()).toEqual({
      resource,
      authorization_servers: [issuer],
      bearer_methods_supported: ["header"],
      scopes_supported: ["read"],
    });
  });

  it("mirrors authorization server metadata", async () => {
    const handler = createAuthorizationServerMirrorHandler(
      introspectionConfig(mockFetch(() => jsonResponse(serverMetadata))),
    );
    expect(await (await handler()).json()).toEqual(serverMetadata);
  });

  it("returns 502 when the upstream is unavailable", async () => {
    const handler = createAuthorizationServerMirrorHandler(
      introspectionConfig(mockFetch(() => jsonResponse({}, { status: 500 }))),
    );
    expect((await handler()).status).toBe(502);
  });

  it("builds a parseable 401 challenge", () => {
    const response = createUnauthorizedResponse(introspectionConfig(), {
      error: "invalid_token",
      errorDescription: 'bad "token"',
      scope: ["read", "write"],
    });
    expect(response.status).toBe(401);
    expect(
      parseWwwAuthenticate(response.headers.get("www-authenticate")),
    ).toMatchObject({
      error: "invalid_token",
      errorDescription: 'bad "token"',
      scope: "read write",
      resourceMetadata: metadataUrl,
    });
  });
});

describe("introspection verification", () => {
  it("accepts an active token and exposes claims", async () => {
    const fetchMock = mockFetch(() => jsonResponse(activeClaims));
    const auth = await verifyAccessToken("tok", introspectionConfig(fetchMock));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${issuer}/oauth2/introspect`);
    expect(formBody(init)).toEqual({
      token: "tok",
      token_type_hint: "access_token",
      client_id: "srv",
      client_secret: "secret",
    });
    expect(auth).toMatchObject({
      subject: "kp_1",
      clientId: "agent1",
      scopes: ["read", "write"],
      permissions: ["read:data"],
    });
    expect(hasPermission(auth, "read:data")).toBe(true);
    expect(hasPermission(auth, "delete:data")).toBe(false);
  });

  it.each([
    ["inactive", { active: false }],
    ["wrong audience", { ...activeClaims, aud: ["https://other.example.com"] }],
    ["expired", { ...activeClaims, exp: 1 }],
    ["wrong issuer", { ...activeClaims, iss: "https://evil.example.com" }],
  ])("rejects %s tokens", async (_name, body) => {
    const config = introspectionConfig(mockFetch(() => jsonResponse(body)));
    await expect(verifyAccessToken("tok", config)).rejects.toMatchObject({
      code: "invalid_token",
    });
  });

  it("authenticates requests and issues challenges", async () => {
    const config = introspectionConfig(
      mockFetch(() => jsonResponse(activeClaims)),
    );

    const missing = await authenticateRequest(new Request(resource), config);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.response.status).toBe(401);
      expect(
        parseWwwAuthenticate(missing.response.headers.get("www-authenticate"))
          ?.error,
      ).toBeUndefined();
    }

    expect((await authenticateRequest(bearer("tok"), config)).ok).toBe(true);
  });

  it("returns invalid_token for rejected tokens and rethrows infrastructure errors", async () => {
    const rejected = await authenticateRequest(
      bearer("tok"),
      introspectionConfig(mockFetch(() => jsonResponse({ active: false }))),
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(
        parseWwwAuthenticate(rejected.response.headers.get("www-authenticate"))
          ?.error,
      ).toBe("invalid_token");
    }

    await expect(
      authenticateRequest(
        bearer("tok"),
        introspectionConfig(
          mockFetch(() =>
            jsonResponse({ error: "invalid_client" }, { status: 401 }),
          ),
        ),
      ),
    ).rejects.toMatchObject({ code: "invalid_client" });
  });
});

describe("local verification", () => {
  let keyPair: CryptoKeyPair;
  let jwk: JsonWebKey & { kid: string };

  const claims: Record<string, unknown> = {
    ...activeClaims,
    active: undefined,
  };

  beforeAll(async () => {
    keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    jwk = {
      ...(await crypto.subtle.exportKey("jwk", keyPair.publicKey)),
      kid: "k1",
    };
  });

  const sign = async (payload: Record<string, unknown>, kid = "k1") => {
    const head = base64UrlEncode(JSON.stringify({ alg: "RS256", kid }));
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      keyPair.privateKey,
      new TextEncoder().encode(`${head}.${body}`),
    );
    return `${head}.${body}.${base64UrlEncode(signature)}`;
  };

  const localConfig = () =>
    createResourceServerConfig({
      issuer,
      resource,
      verification: "local",
      fetch: mockFetch(() => jsonResponse({ keys: [jwk] })),
    });

  it("verifies a signed token", async () => {
    const auth = await verifyAccessToken(await sign(claims), localConfig());
    expect(auth).toMatchObject({
      subject: "kp_1",
      permissions: ["read:data"],
    });
  });

  it("caches the JWKS across verifications", async () => {
    const config = localConfig();
    await verifyAccessToken(await sign(claims), config);
    await verifyAccessToken(await sign(claims), config);
    expect(config.fetch).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects tokens that are not yet valid", async () => {
    const nbf = Math.floor(Date.now() / 1000) + 600;
    await expect(
      verifyAccessToken(await sign({ ...claims, nbf }), localConfig()),
    ).rejects.toMatchObject({ code: "invalid_token" });
  });

  it("rejects unsupported signing algorithms", async () => {
    const token = `${base64UrlEncode(JSON.stringify({ alg: "HS256" }))}.e30.sig`;
    await expect(verifyAccessToken(token, localConfig())).rejects.toMatchObject(
      { code: "invalid_token" },
    );
  });

  it("fails when crypto.subtle is unavailable", async () => {
    const token = await sign(claims);
    vi.stubGlobal("crypto", undefined);
    await expect(verifyAccessToken(token, localConfig())).rejects.toMatchObject(
      { code: "crypto_unavailable" },
    );
  });

  it("rejects tampered signatures, unknown keys and missing expiry", async () => {
    const [head, , signature] = (await sign(claims)).split(".");
    const forged = base64UrlEncode(JSON.stringify({ ...claims, sub: "evil" }));

    await expect(
      verifyAccessToken(`${head}.${forged}.${signature}`, localConfig()),
    ).rejects.toMatchObject({ code: "invalid_token" });
    await expect(
      verifyAccessToken(await sign(claims, "other"), localConfig()),
    ).rejects.toMatchObject({ code: "invalid_token" });
    await expect(
      verifyAccessToken(
        await sign({ ...claims, exp: undefined }),
        localConfig(),
      ),
    ).rejects.toMatchObject({ code: "invalid_token" });
    await expect(
      verifyAccessToken("not.a.jwt", localConfig()),
    ).rejects.toMatchObject({ code: "invalid_token" });
  });
});

describe("adminRevoke", () => {
  it("revokes through the derived endpoint with server credentials", async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 200 }));
    await adminRevoke(introspectionConfig(fetchMock), "tok", "access_token");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${issuer}/oauth2/revoke`);
    expect(formBody(init)).toEqual({
      token: "tok",
      token_type_hint: "access_token",
      client_id: "srv",
      client_secret: "secret",
    });
  });

  it("requires a clientId", async () => {
    const config = createResourceServerConfig({
      issuer,
      resource,
      verification: "local",
    });
    await expect(adminRevoke(config, "tok")).rejects.toMatchObject({
      code: "missing_client_credentials",
    });
  });
});
