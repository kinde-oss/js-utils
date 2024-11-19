import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exchangeAuthCode } from ".";
import { MemoryStorage, StorageKeys } from "../sessionManager";
import { setActiveStorage } from "./token";
import createFetchMock from "vitest-fetch-mock";
import { frameworkSettings } from "./exchangeAuthCode";
import * as refreshTokenTimer from "./refreshTimer";
import * as main from "../main";

const fetchMock = createFetchMock(vi);

describe("exchangeAuthCode", () => {
  beforeEach(() => {
    fetchMock.enableMocks();
    vi.spyOn(refreshTokenTimer, "setRefreshTimer");
    vi.spyOn(main, "refreshToken");
    vi.useFakeTimers();
  });

  afterEach(() => {
    fetchMock.resetMocks();
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
    });

    const input = "hello";

    const urlParams = new URLSearchParams();
    urlParams.append("code", input);
    urlParams.append("state", state);
    urlParams.append("client_id", "test");

    fetchMock.mockResponseOnce(
      JSON.stringify({
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
    expect((options?.headers as Headers).get("Cache-Control")).toEqual(
      "no-store",
    );
    expect((options?.headers as Headers).get("Pragma")).toEqual("no-cache");
  });

  it("set the framework and version on header", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

    const state = "state";

    await store.setItems({
      [StorageKeys.state]: state,
    });

    frameworkSettings.framework = "Framework";
    frameworkSettings.frameworkVersion = "Version";

    const input = "hello";

    const urlParams = new URLSearchParams();
    urlParams.append("code", input);
    urlParams.append("state", state);
    urlParams.append("client_id", "test");

    fetchMock.mockResponseOnce(
      JSON.stringify({
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
      "Framework/Version",
    );
  });

  it("should handle token exchange failure", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);

    const state = "state";

    await store.setItems({
      [StorageKeys.state]: state,
    });

    const input = "hello";

    const urlParams = new URLSearchParams();
    urlParams.append("code", input);
    urlParams.append("state", state);
    urlParams.append("client_id", "test");

    fetchMock.mockOnce({ status: 500, ok: false, body: "error" });

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
    });

    frameworkSettings.framework = "Framework";
    frameworkSettings.frameworkVersion = "Version";

    const input = "hello";

    const urlParams = new URLSearchParams();
    urlParams.append("code", input);
    urlParams.append("state", state);
    urlParams.append("client_id", "test");

    fetchMock.mockResponseOnce(
      JSON.stringify({
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
      autoReferesh: true,
    });

    expect(refreshTokenTimer.setRefreshTimer).toHaveBeenCalledOnce();
    expect(refreshTokenTimer.setRefreshTimer).toHaveBeenCalledWith(
      3600,
      expect.any(Function),
    );
    vi.advanceTimersByTime(3600 * 1000);
    expect(main.refreshToken).toHaveBeenCalledTimes(1);
  });
});
