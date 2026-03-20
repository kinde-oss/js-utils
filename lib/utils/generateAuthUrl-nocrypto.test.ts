import { generateAuthUrl, generatePKCEPair } from "./generateAuthUrl";
import { IssuerRouteTypes, LoginOptions, Scopes } from "../types";
import { generateRandomString } from "./generateRandomString";
import { describe, it, expect, vi } from "vitest";
import { base64UrlEncode } from "./base64UrlEncode";
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

describe("generatePKCEPair - no crypto", () => {
  it("should generate a code verifier of length 52", async () => {
    const { codeVerifier } = await generatePKCEPair();
    expect(codeVerifier).toHaveLength(52);
  });

  it("should generate a URL-safe code challenge (no +, /, or trailing =)", async () => {
    const { codeChallenge } = await generatePKCEPair();
    expect(codeChallenge).not.toContain("+");
    expect(codeChallenge).not.toContain("/");
    expect(codeChallenge).not.toMatch(/=$/);
  });

  it("should generate code challenge from direct base64UrlEncode when crypto is not available", async () => {
    const { codeVerifier, codeChallenge } = await generatePKCEPair();

    // When crypto is not available, codeChallenge should be the direct base64url-encoded verifier
    const expectedChallenge = base64UrlEncode(codeVerifier);

    expect(codeChallenge).toBe(expectedChallenge);
  });

  it("should return both codeVerifier and codeChallenge", async () => {
    const result = await generatePKCEPair();
    expect(result).toHaveProperty("codeVerifier");
    expect(result).toHaveProperty("codeChallenge");
    expect(typeof result.codeVerifier).toBe("string");
    expect(typeof result.codeChallenge).toBe("string");
    expect(result.codeVerifier.length).toBeGreaterThan(0);
    expect(result.codeChallenge.length).toBeGreaterThan(0);
  });

  it("should generate valid base64url characters in code challenge", async () => {
    const { codeChallenge } = await generatePKCEPair();
    // Base64URL characters: A-Z, a-z, 0-9, -, _
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    expect(codeChallenge).toMatch(base64UrlPattern);
  });

  it("should generate different code verifiers on each call", async () => {
    const pair1 = await generatePKCEPair();
    const pair2 = await generatePKCEPair();
    expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
  });

  it("should generate different code challenges on each call", async () => {
    const pair1 = await generatePKCEPair();
    const pair2 = await generatePKCEPair();
    expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
  });
});
