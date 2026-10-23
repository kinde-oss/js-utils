import { describe, expect, it } from "vitest";
import { buildAuthorizationUrl } from "./authorize";
import { base64UrlEncode } from "../utils/base64UrlEncode";
import { serverMetadata } from "./testUtils";

const options = {
  authorizationServer: serverMetadata,
  clientId: "client-1",
  redirectUri: "https://app.example.com/callback",
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

  it("rejects servers that do not advertise PKCE methods", async () => {
    await expect(
      buildAuthorizationUrl({
        ...options,
        authorizationServer: {
          ...serverMetadata,
          code_challenge_methods_supported: undefined,
        },
      }),
    ).rejects.toMatchObject({ code: "pkce_unsupported" });
  });
});
