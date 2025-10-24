import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exchangeAuthCode } from ".";
import { MemoryStorage, StorageKeys } from "../sessionManager";
import {
  setActiveStorage,
  clearActiveStorage,
  clearInsecureStorage,
} from "./token";
import { frameworkSettings } from "./exchangeAuthCode";
import * as refreshTokenTimer from "./refreshTimer";
import * as main from "../main";

const fetchMock = vi.fn<typeof fetch>();

const jsonResponse = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

describe("exchangeAuthCode", () => {
  const mockStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    getSessionItem: vi.fn(),
    setSessionItem: vi.fn(),
    removeSessionItem: vi.fn(),
    destroySession: vi.fn(),
    setItems: vi.fn(),
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(refreshTokenTimer, "setRefreshTimer");
    vi.spyOn(main, "refreshToken");
    vi.useFakeTimers();
    main.storageSettings.useInsecureForRefreshToken = false;
    main.clearInsecureStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("missing state param", async () => {
    const urlParams = new URLSearchParams();
    urlParams.append("code", "test");

    const result = await exchangeAuthCode({
      urlParams,
      domain: "http://test.kinde.com",
      clientId: "test",
      redirectURL: "http://test.kinde.com",
    });

    expect(result).toStrictEqual({
      success: false,
      error: "Invalid state or code",
    });
  });

  it("missing code param", async () => {
    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");

    const result = await exchangeAuthCode({
      urlParams,
      domain: "http://test.kinde.com",
      clientId: "test",
      redirectURL: "http://test.kinde.com",
    });

    expect(result).toStrictEqual({
      success: false,
      error: "Invalid state or code",
    });
  });

  it("missing active storage", async () => {
    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");
    urlParams.append("code", "test");

    expect(
      await exchangeAuthCode({
        urlParams,
        domain: "http://test.kinde.com",
        clientId: "test",
        redirectURL: "http://test.kinde.coma",
      }),
    ).toStrictEqual({
      error: "Authentication storage is not initialized",
      success: false,
    });
  });

  it("state mismatch", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

    await store.setItems({
      [StorageKeys.state]: "storedState",
    });

    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");
    urlParams.append("code", "test");

    const result = await exchangeAuthCode({
      urlParams,
      domain: "http://test.kinde.com",
      clientId: "test",
      redirectURL: "http://test.kinde.com",
    });

    expect(result).toStrictEqual({
      success: false,
      error: "Invalid state; supplied test, expected storedState",
    });
  });

  it("should exchange tokens, set storage and clear temp values", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

    const state = "state";

    await store.setItems({
      [StorageKeys.state]: state,
      [StorageKeys.codeVerifier]: "verifier",
    });

    const input = "hello";

    const urlParams = new URLSearchParams();
    urlParams.append("code", input);
    urlParams.append("state", state);
    urlParams.append("client_id", "test");

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access_token: "access_token",
        refresh_token: "refresh_token",
        id_token: "id_token",
      }),
    );

    const result = await exchangeAuthCode({
      urlParams,
      domain: "http://test.kinde.com",
      clientId: "test",
      redirectURL: "http://test.kinde.com",
    });
    expect(result).toStrictEqual({
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      success: true,
    });

    const postStoredState = await store.getSessionItem(StorageKeys.state);
    expect(postStoredState).toBeNull();
    const postCodeVerifier = await store.getSessionItem(
      StorageKeys.codeVerifier,
    );
    expect(postCodeVerifier).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.kinde.com/oauth2/token");
    expect(options).toMatchObject({
      method: "POST",
    });
    expect((options?.headers as Headers).get("Content-type")).toEqual(
      "application/x-www-form-urlencoded; charset=UTF-8",
    );
  });

  it("uses insecure storage for code verifier when storage setting applies", async () => {
    const store = new MemoryStorage();
    main.setInsecureStorage(store);

    const store2 = new MemoryStorage();
    const state = "state";

    await store.setItems({
      [StorageKeys.state]: state,
      [StorageKeys.codeVerifier]: "verifier",
    });

    const input = "hello";

    const urlParams = new URLSearchParams();
    urlParams.append("code", input);
    urlParams.append("state", state);
    urlParams.append("client_id", "test");

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access_token: "access_token",
        refresh_token: "refresh_token",
        id_token: "id_token",
      }),
    );

    main.storageSettings.useInsecureForRefreshToken = true;

    const result = await exchangeAuthCode({
      urlParams,
      domain: "http://test.kinde.com",
      clientId: "test",
      redirectURL: "http://test.kinde.com",
    });

    expect(result).toStrictEqual({
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      success: true,
    });

    const postCodeVerifier = await store.getSessionItem(
      StorageKeys.codeVerifier,
    );
    expect(postCodeVerifier).toBeNull();
    const insecureRefreshToken = await store2.getSessionItem(
      StorageKeys.refreshToken,
    );
    expect(insecureRefreshToken).toBeNull();
  });

  it("set the framework and version on header", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

    const state = "state";

    await store.setItems({
      [StorageKeys.state]: state,
      [StorageKeys.codeVerifier]: "verifier",
    });

    frameworkSettings.framework = "Framework";
    frameworkSettings.frameworkVersion = "Version";
    frameworkSettings.sdkVersion = "SDKVersion";

    const input = "hello";

    const urlParams = new URLSearchParams();
    urlParams.append("code", input);
    urlParams.append("state", state);
    urlParams.append("client_id", "test");

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access_token: "access_token",
        refresh_token: "refresh_token",
        id_token: "id_token",
        expires_in: 3600,
      }),
    );

    await exchangeAuthCode({
      urlParams,
      domain: "http://test.kinde.com",
      clientId: "test",
      redirectURL: "http://test.kinde.com",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.kinde.com/oauth2/token");
    expect(options).toMatchObject({
      method: "POST",
    });
    expect((options?.headers as Headers).get("Kinde-SDK")).toEqual(
      "Framework/SDKVersion/Version/Javascript",
    );
  });

  it("should handle token exchange failure", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

    const state = "state";

    await store.setItems({
      [StorageKeys.state]: state,
      [StorageKeys.codeVerifier]: "verifier",
    });

    const input = "hello";

    const urlParams = new URLSearchParams();
    urlParams.append("code", input);
    urlParams.append("state", state);
    urlParams.append("client_id", "test");

    fetchMock.mockResolvedValueOnce(
      new Response("error", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    const result = await exchangeAuthCode({
      urlParams,
      domain: "http://test.kinde.com",
      clientId: "test",
      redirectURL: "http://test.kinde.com",
    });

    expect(result).toStrictEqual({
      success: false,
      error: "Token exchange failed: 500 - error",
    });
  });

  it("should set the refresh timer", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

    const state = "state";

    await store.setItems({
      [StorageKeys.state]: state,
      [StorageKeys.codeVerifier]: "verifier",
    });

    frameworkSettings.framework = "Framework";
    frameworkSettings.frameworkVersion = "Version";

    const input = "hello";

    const urlParams = new URLSearchParams();
    urlParams.append("code", input);
    urlParams.append("state", state);
    urlParams.append("client_id", "test");

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access_token: "access_token",
        refresh_token: "refresh_token",
        id_token: "id_token",
        expires_in: 3600,
      }),
    );

    await exchangeAuthCode({
      urlParams,
      domain: "http://test.kinde.com",
      clientId: "test",
      redirectURL: "http://test.kinde.com",
      autoRefresh: true,
    });

    expect(refreshTokenTimer.setRefreshTimer).toHaveBeenCalledOnce();
    expect(refreshTokenTimer.setRefreshTimer).toHaveBeenCalledWith(
      3600,
      expect.any(Function),
    );
    vi.advanceTimersByTime(3600 * 1000);
    expect(main.refreshToken).toHaveBeenCalledTimes(1);
  });

  it("should return error if state or code is missing", async () => {
    const urlParams = new URLSearchParams();
    const result = await exchangeAuthCode({
      urlParams,
      domain: "test.com",
      clientId: "test",
      redirectURL: "test.com",
    });

    expect(result).toEqual({
      success: false,
      error: "Invalid state or code",
    });
  });

  it("should return error if storage is not available", async () => {
    clearActiveStorage();
    clearInsecureStorage();
    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");
    urlParams.append("code", "test");

    const result = await exchangeAuthCode({
      urlParams,
      domain: "test.com",
      clientId: "test",
      redirectURL: "test.com",
    });

    expect(result).toEqual({
      success: false,
      error: "Authentication storage is not initialized",
    });
  });

  it("should return error if state is invalid", async () => {
    setActiveStorage(new MemoryStorage());
    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");
    urlParams.append("code", "test");
    mockStorage.getItem.mockReturnValue("different-state");

    const result = await exchangeAuthCode({
      urlParams,
      domain: "test.com",
      clientId: "test",
      redirectURL: "test.com",
    });

    expect(result).toEqual({
      success: false,
      error: "Invalid state; supplied test, expected null",
    });
  });

  it("should return error if code verifier is missing", async () => {
    const store = new MemoryStorage();
    await store.setSessionItem(StorageKeys.state, "test");
    setActiveStorage(store);

    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");
    urlParams.append("code", "test");

    const result = await exchangeAuthCode({
      urlParams,
      domain: "test.com",
      clientId: "test",
      redirectURL: "test.com",
    });

    expect(result).toEqual({
      success: false,
      error: "Code verifier not found",
    });
  });

  it("should return error if fetch fails", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(StorageKeys.state, "test");
    await store.setSessionItem(StorageKeys.codeVerifier, "verifier");
    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");
    urlParams.append("code", "test");
    mockStorage.getItem.mockImplementation((key) => {
      if (key === StorageKeys.state) return "test";
      if (key === StorageKeys.codeVerifier) return "verifier";
      return null;
    });
    fetchMock.mockRejectedValueOnce(new Error("Fetch failed"));

    await expect(
      exchangeAuthCode({
        urlParams,
        domain: "test.com",
        clientId: "test",
        redirectURL: "test.com",
      }),
    ).resolves.toEqual({
      error: "Token exchange failed: Error: Fetch failed",
      success: false,
    });
  });

  it("should return error if token response is invalid", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(StorageKeys.state, "test");
    await store.setSessionItem(StorageKeys.codeVerifier, "verifier");
    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");
    urlParams.append("code", "test");
    mockStorage.getItem.mockImplementation((key) => {
      if (key === StorageKeys.state) return "test";
      if (key === StorageKeys.codeVerifier) return "verifier";
      return null;
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    const result = await exchangeAuthCode({
      urlParams,
      domain: "test.com",
      clientId: "test",
      redirectURL: "test.com",
    });

    expect(result).toEqual({
      success: false,
      error: "No access token received",
    });
  });

  it("should handle client secret correctly", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(StorageKeys.state, "test");
    await store.setSessionItem(StorageKeys.codeVerifier, "verifier");
    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");
    urlParams.append("code", "test");
    mockStorage.getItem.mockImplementation((key) => {
      if (key === StorageKeys.state) return "test";
      if (key === StorageKeys.codeVerifier) return "verifier";
      return null;
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await exchangeAuthCode({
      urlParams,
      domain: "test.com",
      clientId: "test",
      redirectURL: "test.com",
      clientSecret: "secret",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "test.com/oauth2/token",
      expect.objectContaining({
        body: expect.any(URLSearchParams),
      }),
    );

    const fetchCall = fetchMock.mock.calls[0];
    const actualBody = fetchCall[1]?.body as URLSearchParams;

    expect(actualBody.get("client_id")).toBe("test");
    expect(actualBody.get("code")).toBe("test");
    expect(actualBody.get("code_verifier")).toBe("verifier");
    expect(actualBody.get("grant_type")).toBe("authorization_code");
    expect(actualBody.get("redirect_uri")).toBe("test.com");
    expect(actualBody.get("client_secret")).toBe("secret");
  });

  it("should handle auto refresh correctly", async () => {
    const store = new MemoryStorage();

    setActiveStorage(store);
    await store.setItems({
      [StorageKeys.state]: "test",
      [StorageKeys.codeVerifier]: "verifier",
    });
    vi.spyOn(store, "setSessionItem");
    const urlParams = new URLSearchParams();
    urlParams.append("state", "test");
    urlParams.append("code", "test");
    mockStorage.getItem.mockImplementation((key) => {
      if (key === StorageKeys.state) return "test";
      if (key === StorageKeys.codeVerifier) return "verifier";
      return null;
    });

    fetchMock.mockResolvedValue(
      jsonResponse({
        access_token: "access",
        id_token: "id",
        refresh_token: "refresh",
      }),
    );

    const result = await exchangeAuthCode({
      urlParams,
      domain: "test.com",
      clientId: "test",
      redirectURL: "test.com",
      autoRefresh: true,
    });

    expect(result.success).toBe(true);
    expect(store.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.refreshToken,
      "refresh",
    );
  });

  it("returns error when persisting tokens to secure storage fails", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

    await store.setItems({
      [StorageKeys.state]: "state",
      [StorageKeys.codeVerifier]: "verifier",
    });

    const urlParams = new URLSearchParams();
    urlParams.append("code", "hello");
    urlParams.append("state", "state");
    urlParams.append("client_id", "test");

    fetchMock.mockResponseOnce(
      JSON.stringify({
        access_token: "access_token",
        refresh_token: "refresh_token",
        id_token: "id_token",
      }),
    );

    const setItemsSpy = vi
      .spyOn(store, "setItems")
      .mockRejectedValue(new Error("Persist failed"));

    const result = await exchangeAuthCode({
      urlParams,
      domain: "http://test.kinde.com",
      clientId: "test",
      redirectURL: "http://test.kinde.com",
    });

    expect(setItemsSpy).toHaveBeenCalled();
    expect(result).toStrictEqual({
      success: false,
      error: expect.stringContaining(
        "Failed to persist tokens: Error: Persist failed",
      ),
    });
  });
});
