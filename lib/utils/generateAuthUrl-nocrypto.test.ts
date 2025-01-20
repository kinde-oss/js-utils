import { generateAuthUrl } from "./generateAuthUrl";
import { IssuerRouteTypes, LoginOptions, Scopes } from "../types";
import { generateRandomString } from "./generateRandomString";
import { describe, it, expect, vi } from "vitest";
vi.stubGlobal("crypto", undefined);
Object.defineProperty(global, "crypto", {
  value: undefined, // Set to undefined to 'clear' crypto
  writable: true, // Allow the property to be rewritten later if needed
  configurable: true, // Allow the property definition itself to be changed, enabling resetting in teardown
});

describe("generateRandomString - no crypto", () => {
  it("should generate a string of the specified length", () => {
    const length = 10;
    const result = generateRandomString(length);
    expect(result).toHaveLength(length);
  });

  it("should generate the correct auth URL with required parameters", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions = {
      clientId: "client123",
      responseType: "code",
      scope: [Scopes.openid, Scopes.profile],
      loginHint: "user@example.com",
      isCreateOrg: true,
      connectionId: "conn123",
      redirectURL: "https://example.com",
      audience: "audience123",
      state: "state123",
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&login_hint=user%40example.com&is_create_org=true&connection_id=conn123&redirect_uri=https%3A%2F%2Fexample.com&audience=audience123&scope=openid+profile&state=state123&code_challenge_method=S256";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    result.url.searchParams.delete("nonce");
    const codeChallenge = result.url.searchParams.get("code_challenge");
    expect(codeChallenge!.length).toBeGreaterThanOrEqual(27);
    result.url.searchParams.delete("code_challenge");
    expect(result.url.toString()).toBe(expectedUrl);
  });
});
