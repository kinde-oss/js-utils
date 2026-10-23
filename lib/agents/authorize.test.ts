import { describe, expect, it } from "vitest";
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
