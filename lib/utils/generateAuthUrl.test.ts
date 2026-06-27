import { describe, it, expect, vi } from "vitest";
import { IssuerRouteTypes, LoginOptions, PromptTypes, Scopes } from "../types";
import { generateAuthUrl, generatePKCEPair } from "./generateAuthUrl";
import { MemoryStorage, StorageKeys } from "../sessionManager";
import { setActiveStorage } from "./token";
import { base64UrlEncode } from "./base64UrlEncode";

describe("generateAuthUrl", () => {
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

  it("should generate the register URL when type is 'registration'", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions = {
      clientId: "client123",
      responseType: "code",
      scope: [Scopes.openid, Scopes.profile],
      state: "state123",
      codeChallenge: "challenge123",
      codeChallengeMethod: "S256",
      redirectURL: "https://example2.com",
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com&audience=&scope=openid+profile&state=state123&code_challenge=challenge123&code_challenge_method=S256&prompt=create";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.register,
      options,
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    result.url.searchParams.delete("nonce");

    expect(result.url.toString()).toBe(expectedUrl);
  });

  it("should include optional parameters if provided", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions = {
      clientId: "client123",
      responseType: "code",
      scope: [Scopes.openid, Scopes.profile],
      state: "state123",
      codeChallenge: "challenge123",
      codeChallengeMethod: "S256",
      redirectURL: "https://example2.com",
      prompt: PromptTypes.login,
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com&audience=&scope=openid+profile&prompt=login&state=state123&code_challenge=challenge123&code_challenge_method=S256";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    result.url.searchParams.delete("nonce");

    expect(result.url.toString()).toBe(expectedUrl);
  });

  it("should handle default responseType if not provided", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions = {
      clientId: "client123",
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com",
      prompt: PromptTypes.create,
      state: "state123",
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com&audience=&scope=openid+profile+offline&prompt=create&state=state123&code_challenge_method=S256";

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

  it("should handle default responseType if not provided", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions = {
      clientId: "client123",
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com",
      prompt: PromptTypes.create,
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com&audience=&scope=openid+profile+offline&prompt=create&code_challenge_method=S256";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    const state = result.url.searchParams.get("state");
    expect(state).not.toBeNull();
    expect(state!.length).toBe(32);
    const codeChallenge = result.url.searchParams.get("code_challenge");
    expect(codeChallenge!.length).toBeGreaterThanOrEqual(27);
    result.url.searchParams.delete("code_challenge");
    result.url.searchParams.delete("nonce");
    result.url.searchParams.delete("state");
    expect(result.url.toString()).toBe(expectedUrl);
  });

  it("should update state when active state found", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

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
      prompt: PromptTypes.login,
    };

    await generateAuthUrl(domain, IssuerRouteTypes.login, options);

    const state = await store.getSessionItem(StorageKeys.state);
    const nonce = await store.getSessionItem(StorageKeys.nonce);
    const codeVerifier = await store.getSessionItem(StorageKeys.state);

    expect(state).toBeDefined();
    expect(nonce).toBeDefined();
    expect(codeVerifier).toBeDefined();
  });

  it("if state is defined, ensure its stored in correctly", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

    const testState = "testState:123";
    const domain = "https://auth.example.com";
    const options: LoginOptions = {
      clientId: "client123",
      redirectURL: "https://example.com",
      prompt: PromptTypes.login,
      state: testState,
    };

    await generateAuthUrl(domain, IssuerRouteTypes.login, options);

    const state = await store.getSessionItem(StorageKeys.state);

    expect(state).toEqual(testState);
  });

  it("should handle state parameter containing = (URL-encoded so auth URL loads correctly)", async () => {
    const domain = "https://auth.example.com";
    const stateWithEquals = "key=value&other=thing";
    const options: LoginOptions = {
      clientId: "client123",
      scope: [Scopes.openid, Scopes.profile],
      redirectURL: "https://example.com",
      state: stateWithEquals,
    };

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
    );

    expect(result.state).toBe(stateWithEquals);
    const stateFromUrl = result.url.searchParams.get("state");
    expect(stateFromUrl).toBe(stateWithEquals);
    expect(result.url.toString()).toContain("state=");
    expect(result.url.searchParams.get("state")).toBe(stateWithEquals);
  });

  it("if disableUrlSanitization is set, should leave the redirect the URL alone", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions = {
      clientId: "client123",
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com/",
      prompt: PromptTypes.create,
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com%2F&audience=&scope=openid+profile+offline&prompt=create&code_challenge_method=S256";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
      {
        disableUrlSanitization: true,
      },
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    const state = result.url.searchParams.get("state");
    expect(state).not.toBeNull();
    expect(state!.length).toBe(32);
    const codeChallenge = result.url.searchParams.get("code_challenge");
    expect(codeChallenge!.length).toBeGreaterThanOrEqual(27);
    result.url.searchParams.delete("code_challenge");
    result.url.searchParams.delete("nonce");
    result.url.searchParams.delete("state");
    expect(result.url.toString()).toBe(expectedUrl);
  });

  it("Properties are added when defined", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions = {
      clientId: "client123",
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com",
      prompt: PromptTypes.create,
      properties: {
        utm_campaign: "test",
      },
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com&audience=&scope=openid+profile+offline&prompt=create&code_challenge_method=S256&utm_campaign=test";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    const state = result.url.searchParams.get("state");
    expect(state).not.toBeNull();
    expect(state!.length).toBe(32);
    const codeChallenge = result.url.searchParams.get("code_challenge");
    expect(codeChallenge!.length).toBeGreaterThanOrEqual(27);
    result.url.searchParams.delete("code_challenge");
    result.url.searchParams.delete("nonce");
    result.url.searchParams.delete("state");
    expect(result.url.toString()).toBe(expectedUrl);
  });

  it("When non whitelisted properties are added when defined, warn for each one do not add to the url", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn");

    const domain = "https://auth.example.com";
    const options: LoginOptions<{
      testProperty1: string;
      testProperty2: string;
    }> = {
      clientId: "client123",
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com",
      prompt: PromptTypes.create,
      properties: {
        utm_campaign: "test",
        testProperty1: "testValue1",
        testProperty2: "testValue2",
      },
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com&audience=&scope=openid+profile+offline&prompt=create&code_challenge_method=S256&utm_campaign=test";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    const state = result.url.searchParams.get("state");
    expect(state).not.toBeNull();
    expect(state!.length).toBe(32);
    const codeChallenge = result.url.searchParams.get("code_challenge");
    expect(codeChallenge!.length).toBeGreaterThanOrEqual(27);
    result.url.searchParams.delete("code_challenge");
    result.url.searchParams.delete("nonce");
    result.url.searchParams.delete("state");
    expect(result.url.toString()).toBe(expectedUrl);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Unsupported Property for url generation: ",
      "testProperty1",
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Unsupported Property for url generation: ",
      "testProperty2",
    );
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      "Unsupported Property for url generation: ",
      "utm_campaign",
    );
  });

  it("When non whitelisted properties are added when defined, warn for each one do not add to the url", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions<{
      testProperty1: string;
      testProperty2: string;
    }> = {
      clientId: "client123",
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com",
      prompt: PromptTypes.create,
      audience: "http://test.test.com https://another.test.com",
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com&audience=http%3A%2F%2Ftest.test.com+https%3A%2F%2Fanother.test.com&scope=openid+profile+offline&prompt=create&code_challenge_method=S256";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    const state = result.url.searchParams.get("state");
    expect(state).not.toBeNull();
    expect(state!.length).toBe(32);
    const codeChallenge = result.url.searchParams.get("code_challenge");
    expect(codeChallenge!.length).toBeGreaterThanOrEqual(27);
    result.url.searchParams.delete("code_challenge");
    result.url.searchParams.delete("nonce");
    result.url.searchParams.delete("state");
    expect(result.url.toString()).toBe(expectedUrl);
  });

  it("When non whitelisted properties are added when defined, warn for each one do not add to the url", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions<{
      testProperty1: string;
      testProperty2: string;
    }> = {
      clientId: "client123",
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com",
      prompt: PromptTypes.create,
      audience: ["http://test.test.com", "https://another.test.com"],
    };
    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com&audience=http%3A%2F%2Ftest.test.com+https%3A%2F%2Fanother.test.com&scope=openid+profile+offline&prompt=create&code_challenge_method=S256";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    const state = result.url.searchParams.get("state");
    expect(state).not.toBeNull();
    expect(state!.length).toBe(32);
    const codeChallenge = result.url.searchParams.get("code_challenge");
    expect(codeChallenge!.length).toBeGreaterThanOrEqual(27);
    result.url.searchParams.delete("code_challenge");
    result.url.searchParams.delete("nonce");
    result.url.searchParams.delete("state");
    expect(result.url.toString()).toBe(expectedUrl);
  });

  it("missing clientId", async () => {
    const options: LoginOptions = {
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com",
    };
    const domain = "https://auth.example.com";
    expect(() =>
      generateAuthUrl(domain, IssuerRouteTypes.login, options),
    ).rejects.toThrow(`Error generating auth URL: Client ID missing`);
  });

  it("throws on non-Base64 reauthState", async () => {
    const options: LoginOptions = {
      scope: [Scopes.openid],
      redirectURL: "https://example.com",
      reauthState: "!!!", // invalid Base64
    };
    const domain = "https://auth.example.com";

    await expect(
      generateAuthUrl(domain, IssuerRouteTypes.login, options),
    ).rejects.toThrow(/Error handling reauth state:/);
  });

  it("invalid reauthState", async () => {
    const options: LoginOptions = {
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com",
      reauthState: "e3Rlc3Q6MTIz",
    };
    const domain = "https://auth.example.com";
    expect(() =>
      generateAuthUrl(domain, IssuerRouteTypes.login, options),
    ).rejects.toThrow(
      /Error handling reauth state: Expected property name or '}' in JSON/,
    );
  });

  it("support reauth state", async () => {
    const domain = "https://auth.example.com";
    const options: LoginOptions = {
      scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
      redirectURL: "https://example2.com",
      reauthState:
        "eyJjbGllbnRfaWQiOiJjbGllbnRyZWF1dGgiLCJvcmdfY29kZSI6Im9yZ2NvZGVyZWF1dGgifQ==",
    };

    const expectedUrl =
      "https://auth.example.com/oauth2/auth?client_id=clientreauth&response_type=code&redirect_uri=https%3A%2F%2Fexample2.com&audience=&scope=openid+profile+offline&org_code=orgcodereauth&code_challenge_method=S256";

    const result = await generateAuthUrl(
      domain,
      IssuerRouteTypes.login,
      options,
    );
    const nonce = result.url.searchParams.get("nonce");
    expect(nonce).not.toBeNull();
    expect(nonce!.length).toBe(16);
    const state = result.url.searchParams.get("state");
    expect(state).not.toBeNull();
    expect(state!.length).toBe(32);
    const codeChallenge = result.url.searchParams.get("code_challenge");
    expect(codeChallenge!.length).toBeGreaterThanOrEqual(27);
    result.url.searchParams.delete("code_challenge");
    result.url.searchParams.delete("nonce");
    result.url.searchParams.delete("state");
    expect(result.url.toString()).toBe(expectedUrl);
  });
});

describe("generatePKCEPair", () => {
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

  it("should generate different code verifiers on each call", async () => {
    const pair1 = await generatePKCEPair();
    const pair2 = await generatePKCEPair();
    expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
  });

  it("should generate different code challenges on each call", async () => {
    const pair1 = await generatePKCEPair();
    const pair2 = await generatePKCEPair();
    // Code verifiers should be different (random generation)
    expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
    // If code verifiers are different, challenges should be different
    // (unless there's a hash collision, which is extremely unlikely)
    expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
  });

  it("should generate code challenge correctly based on crypto availability", async () => {
    const { codeVerifier, codeChallenge } = await generatePKCEPair();

    // base64UrlEncode returns base64url (URL-safe); direct encoding matches
    const directEncode = base64UrlEncode(codeVerifier);

    // Check if crypto.subtle is available and working (Web Crypto API)
    const hasWebCrypto =
      typeof crypto !== "undefined" &&
      crypto &&
      crypto.subtle &&
      typeof crypto.subtle.digest === "function";

    // Test if crypto.subtle.digest actually works
    let webCryptoWorks = false;
    if (hasWebCrypto) {
      try {
        const testData = new TextEncoder().encode("test");
        await crypto.subtle.digest("SHA-256", testData.buffer);
        webCryptoWorks = true;
      } catch {
        webCryptoWorks = false;
      }
    }

    if (webCryptoWorks) {
      // When crypto.subtle is available and working, codeChallenge should be the SHA-256 hash
      // The hash-based challenge should be different from direct encoding
      expect(codeChallenge).not.toBe(directEncode);

      // The hash-based challenge should be 43 characters (SHA-256 hash = 32 bytes = 43 base64 chars without padding)
      // But it could be 42 or 43 depending on padding removal
      expect(codeChallenge.length).toBeGreaterThanOrEqual(42);
      expect(codeChallenge.length).toBeLessThanOrEqual(43);
    } else {
      // If crypto.subtle is not available or not working, it should use direct encoding (fallback)
      // Direct encoding of 52-char string should be around 69-70 chars, but after URL-safe replacement it varies
      expect(codeChallenge).toBe(directEncode);
      expect(codeChallenge.length).toBeGreaterThan(0);
    }

    // In all cases, the challenge should be URL-safe
    expect(codeChallenge).not.toContain("+");
    expect(codeChallenge).not.toContain("/");
    expect(codeChallenge).not.toMatch(/=$/);
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
});
