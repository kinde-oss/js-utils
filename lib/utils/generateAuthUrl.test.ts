import { describe, it, expect } from "vitest";
import { IssuerRouteTypes, LoginOptions, PromptTypes, Scopes } from "../types";
import { generateAuthUrl } from "./generateAuthUrl";
import { MemoryStorage, StorageKeys } from "../sessionManager";
import { setActiveStorage } from "./token";

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
      { disableUrlSanitization: true },
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
