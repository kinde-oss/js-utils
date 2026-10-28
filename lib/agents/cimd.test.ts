import { describe, expect, it } from "vitest";
import { buildClientMetadataDocument } from "./cimd";

const base = {
  clientId: "https://app.example.com/oauth/client.json",
  clientName: "My Agent",
  redirectUris: ["https://app.example.com/callback", "myapp://callback"],
};

describe("buildClientMetadataDocument", () => {
  it("builds a public-client document", () => {
    expect(
      buildClientMetadataDocument({ ...base, scope: ["read", "write"] }),
    ).toEqual({
      client_id: base.clientId,
      client_name: "My Agent",
      redirect_uris: base.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "read write",
    });
  });

  it.each([
    "http://app.example.com/client.json",
    "https://app.example.com",
    "https://app.example.com/client.json#frag",
    "https://user:pw@app.example.com/client.json",
    "https://app.example.com/a/../client.json",
    "not a url",
  ])("rejects invalid client_id %s", (clientId) => {
    expect(() => buildClientMetadataDocument({ ...base, clientId })).toThrow();
  });

  it("rejects bad redirect uris", () => {
    for (const uri of [
      "http://app.example.com/cb",
      "javascript:alert(1)",
      "https://app.example.com/cb#x",
    ]) {
      expect(() =>
        buildClientMetadataDocument({ ...base, redirectUris: [uri] }),
      ).toThrow();
    }
    expect(() =>
      buildClientMetadataDocument({ ...base, redirectUris: [] }),
    ).toThrow();
  });

  it("allows loopback http redirects", () => {
    expect(() =>
      buildClientMetadataDocument({
        ...base,
        redirectUris: ["http://127.0.0.1:8123/cb"],
      }),
    ).not.toThrow();
  });

  it("never allows openid or shared-secret auth", () => {
    expect(() =>
      buildClientMetadataDocument({ ...base, scope: "openid read" }),
    ).toThrow(/openid/);
    expect(() =>
      buildClientMetadataDocument({
        ...base,
        tokenEndpointAuthMethod: "client_secret_post",
      }),
    ).toThrow();
  });
});
