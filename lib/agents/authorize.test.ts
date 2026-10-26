import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizationUrl,
  validateAuthorizationResponse,
} from "./authorize";
import { base64UrlEncode } from "../utils/base64UrlEncode";
import { serverMetadata } from "./testUtils";

const options = {
  authorizationServer: serverMetadata,
  clientId: "client-1",
  redirectUri: "https://app.example.com/callback",
  resource: "https://api.example.com/mcp",
};

describe("buildAuthorizationUrl", () => {
  it("builds a PKCE url without nonce or openid", async () => {
    const result = await buildAuthorizationUrl({
      ...options,
      scope: ["read", "write"],
      resource: "https://api.example.com/mcp",
    });
    const params = result.url.searchParams;
    expect(result.url.origin + result.url.pathname).toBe(
      serverMetadata.authorization_endpoint,
    );
    expect(params.get("response_type")).toBe("code");
    expect(params.get("client_id")).toBe("client-1");
    expect(params.get("scope")).toBe("read write");
    expect(params.get("resource")).toBe("https://api.example.com/mcp");
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("state")).toBe(result.state);
    expect(params.has("nonce")).toBe(false);
    expect(result.url.toString()).not.toContain("openid");

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(result.codeVerifier),
    );
    expect(params.get("code_challenge")).toBe(base64UrlEncode(digest));
    expect(result.codeVerifier.length).toBeGreaterThanOrEqual(43);
  });

  it("generates unique state and verifier per call", async () => {
    const a = await buildAuthorizationUrl(options);
    const b = await buildAuthorizationUrl(options);
    expect(a.state).not.toBe(b.state);
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });

  it("rejects openid scope in any form", async () => {
    await expect(
      buildAuthorizationUrl({ ...options, scope: "read openid" }),
    ).rejects.toMatchObject({ code: "openid_scope_not_allowed" });
    await expect(
      buildAuthorizationUrl({ ...options, scope: ["openid"] }),
    ).rejects.toMatchObject({ code: "openid_scope_not_allowed" });
  });

  it("refuses when the server does not advertise PKCE", async () => {
    await expect(
      buildAuthorizationUrl({
        authorizationServer: {
          authorization_endpoint: "https://a.example.com/auth",
        },
        clientId: "c",
        redirectUri: "http://127.0.0.1/cb",
        resource: "https://api.example.com/mcp",
      }),
    ).rejects.toThrow(/pkce_unsupported/);
  });

  it("strips a nonce preconfigured on the authorization endpoint", async () => {
    const result = await buildAuthorizationUrl({
      ...options,
      authorizationServer: {
        ...serverMetadata,
        authorization_endpoint:
          "https://auth.example.com/authorize?nonce=preconfigured&audience=api",
      },
      scope: "read",
    });
    expect(result.url.searchParams.has("nonce")).toBe(false);
    expect(result.url.searchParams.get("audience")).toBe("api");
  });

  it("rejects an openid scope preconfigured on the authorization endpoint", async () => {
    await expect(
      buildAuthorizationUrl({
        ...options,
        authorizationServer: {
          ...serverMetadata,
          authorization_endpoint:
            "https://auth.example.com/authorize?scope=openid&nonce=preconfigured",
        },
      }),
    ).rejects.toMatchObject({ code: "openid_scope_not_allowed" });
    await expect(
      buildAuthorizationUrl({
        ...options,
        authorizationServer: {
          ...serverMetadata,
          authorization_endpoint:
            "https://auth.example.com/authorize?scope=read+openid",
        },
      }),
    ).rejects.toMatchObject({ code: "openid_scope_not_allowed" });
  });

  it("overrides a preconfigured scope when scopes are provided", async () => {
    const result = await buildAuthorizationUrl({
      ...options,
      authorizationServer: {
        ...serverMetadata,
        authorization_endpoint:
          "https://auth.example.com/authorize?scope=openid&nonce=preconfigured",
      },
      scope: "read",
    });
    expect(result.url.searchParams.get("scope")).toBe("read");
    expect(result.url.searchParams.has("nonce")).toBe(false);
    expect(result.url.toString()).not.toContain("openid");
  });

  it("requires S256 support when advertised", async () => {
    await expect(
      buildAuthorizationUrl({
        ...options,
        authorizationServer: {
          ...serverMetadata,
          code_challenge_methods_supported: ["plain"],
        },
      }),
    ).rejects.toMatchObject({ code: "pkce_unsupported" });
  });
});

describe("buildAuthorizationUrl crypto adapter", () => {
  const realCrypto = globalThis.crypto;
  const digestWithNode = async (data: Uint8Array) =>
    realCrypto.subtle.digest("SHA-256", data as BufferSource);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds an S256 challenge through the adapter when subtle is unavailable", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues: realCrypto.getRandomValues.bind(realCrypto),
    });
    const sha256 = vi.fn(
      async (data: Uint8Array) => new Uint8Array(await digestWithNode(data)),
    );

    const result = await buildAuthorizationUrl({
      ...options,
      crypto: { sha256 },
    });

    expect(sha256).toHaveBeenCalledTimes(1);
    expect(result.url.searchParams.get("code_challenge_method")).toBe("S256");
    const expected = base64UrlEncode(
      await digestWithNode(new TextEncoder().encode(result.codeVerifier)),
    );
    expect(result.url.searchParams.get("code_challenge")).toBe(expected);
  });

  it("accepts an ArrayBuffer digest from the adapter", async () => {
    vi.stubGlobal("crypto", {});
    const result = await buildAuthorizationUrl({
      ...options,
      crypto: {
        getRandomValues: (array) =>
          realCrypto.getRandomValues(array as Uint8Array<ArrayBuffer>),
        sha256: digestWithNode,
      },
    });
    const expected = base64UrlEncode(
      await digestWithNode(new TextEncoder().encode(result.codeVerifier)),
    );
    expect(result.url.searchParams.get("code_challenge")).toBe(expected);
  });

  it("uses the adapter's getRandomValues for the verifier and state", async () => {
    vi.stubGlobal("crypto", {});
    const getRandomValues = vi.fn((array: Uint8Array) => {
      array.fill(7);
      return array;
    });
    const result = await buildAuthorizationUrl({
      ...options,
      crypto: { getRandomValues, sha256: digestWithNode },
    });
    expect(getRandomValues).toHaveBeenCalledTimes(2);
    expect(result.codeVerifier).toBe(
      base64UrlEncode(new Uint8Array(32).fill(7).buffer),
    );
    expect(result.state).toBe(
      base64UrlEncode(new Uint8Array(16).fill(7).buffer),
    );
  });

  it("still requires S256 and never falls back to plain", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues: realCrypto.getRandomValues.bind(realCrypto),
    });
    await expect(buildAuthorizationUrl(options)).rejects.toMatchObject({
      code: "crypto_unavailable",
    });
  });

  it("requires some source of randomness", async () => {
    vi.stubGlobal("crypto", {});
    await expect(
      buildAuthorizationUrl({ ...options, crypto: { sha256: digestWithNode } }),
    ).rejects.toMatchObject({ code: "crypto_unavailable" });
  });
});

describe("validateAuthorizationResponse", () => {
  const as = {
    issuer: "https://auth.example.com",
    authorization_response_iss_parameter_supported: true,
  };
  const cb = "http://127.0.0.1/cb";

  it("returns the code when state and iss match", () => {
    expect(
      validateAuthorizationResponse({
        callbackUrl: `${cb}?code=abc&state=s1&iss=https%3A%2F%2Fauth.example.com`,
        expectedState: "s1",
        authorizationServer: as,
      }),
    ).toEqual({ code: "abc" });
  });

  it("accepts a URL object", () => {
    expect(
      validateAuthorizationResponse({
        callbackUrl: new URL(`${cb}?code=abc&state=s1`),
        expectedState: "s1",
        authorizationServer: { issuer: as.issuer },
      }),
    ).toEqual({ code: "abc" });
  });

  it("rejects a response from another issuer", () => {
    expect(() =>
      validateAuthorizationResponse({
        callbackUrl: `${cb}?code=abc&state=s1&iss=https%3A%2F%2Fevil.example.com`,
        expectedState: "s1",
        authorizationServer: as,
      }),
    ).toThrow(/issuer_mismatch/);
  });

  it("rejects a foreign iss even when the server does not advertise it", () => {
    expect(() =>
      validateAuthorizationResponse({
        callbackUrl: `${cb}?code=abc&state=s1&iss=https%3A%2F%2Fevil.example.com`,
        expectedState: "s1",
        authorizationServer: { issuer: as.issuer },
      }),
    ).toThrow(/issuer_mismatch/);
  });

  it("requires iss when the server advertises it", () => {
    expect(() =>
      validateAuthorizationResponse({
        callbackUrl: `${cb}?code=abc&state=s1`,
        expectedState: "s1",
        authorizationServer: as,
      }),
    ).toThrow(/issuer_mismatch/);
  });

  it("rejects a state mismatch", () => {
    expect(() =>
      validateAuthorizationResponse({
        callbackUrl: `${cb}?code=abc&state=other`,
        expectedState: "s1",
        authorizationServer: { issuer: as.issuer },
      }),
    ).toThrow(/state_mismatch/);
  });

  it("rejects a missing state", () => {
    expect(() =>
      validateAuthorizationResponse({
        callbackUrl: `${cb}?code=abc`,
        expectedState: "s1",
        authorizationServer: { issuer: as.issuer },
      }),
    ).toThrow(/state_mismatch/);
  });

  it("surfaces authorization errors", () => {
    expect(() =>
      validateAuthorizationResponse({
        callbackUrl: `${cb}?error=access_denied&error_description=no&state=s1`,
        expectedState: "s1",
        authorizationServer: { issuer: as.issuer },
      }),
    ).toThrow(/access_denied/);
  });

  it("requires a code", () => {
    expect(() =>
      validateAuthorizationResponse({
        callbackUrl: `${cb}?state=s1`,
        expectedState: "s1",
        authorizationServer: { issuer: as.issuer },
      }),
    ).toThrow(/invalid_response/);
  });
});
