import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as CheckAuth from "./checkAuth";
import * as RefreshToken from "./token/refreshToken";
import * as GetCookie from "./getCookie";
import { RefreshType } from "../types";
import { MemoryStorage, StorageKeys } from "../sessionManager";
import { clearActiveStorage, setActiveStorage } from "../main";
import { createMockAccessToken } from "./token/testUtils";
import * as hasTokenExpired from "./token/isTokenExpired";

describe("checkAuth", () => {
  const domain = "auth.test.com";
  const clientId = "client-id";
  const storage = new MemoryStorage();

  beforeEach(() => {
    vi.clearAllMocks();

    setActiveStorage(storage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    storage.destroySession();
    clearActiveStorage();
  });

  it("should use cookie refresh type when using not custom domain and no _kbrte cookie", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(GetCookie, "getCookie").mockResolvedValue("value");

    await CheckAuth.checkAuth({ domain: "test.kinde.com", clientId });

    expect(GetCookie.getCookie).not.toHaveBeenCalled();
    expect(RefreshToken.refreshToken).toHaveBeenCalledWith({
      domain: "test.kinde.com",
      clientId,
      refreshType: RefreshType.refreshToken,
    });
  });

  it("should use cookie refresh type when using custom domain and _kbrte cookie exists", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(GetCookie, "getCookie").mockReturnValue("value");

    await CheckAuth.checkAuth({ domain, clientId });

    expect(GetCookie.getCookie).toHaveBeenCalledWith("_kbrte");

    expect(RefreshToken.refreshToken).toHaveBeenCalledWith({
      domain,
      clientId,
      refreshType: RefreshType.cookie,
    });
  });

  it("should use cookie refresh type when using custom domain and no _kbrte cookie", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(GetCookie, "getCookie").mockReturnValue(null);

    await CheckAuth.checkAuth({ domain, clientId });

    expect(GetCookie.getCookie).toHaveBeenCalledWith("_kbrte");

    expect(RefreshToken.refreshToken).toHaveBeenCalledWith({
      domain,
      clientId,
      refreshType: RefreshType.refreshToken,
    });
  });

  it("should error when domain is null", async () => {
    // @ts-expect-error Testing error case
    const result = await CheckAuth.checkAuth({ domain: null, clientId });
    expect(result).toEqual({
      success: false,
      error: "Domain is required for authentication check",
    });
  });

  it("should error when clientId is null", async () => {
    // @ts-expect-error Testing error case
    const result = await CheckAuth.checkAuth({ domain, clientId: null });
    expect(result).toEqual({
      success: false,
      error: "Client ID is required for authentication check",
    });
  });

  // add a test for when storage is available and the token is expired
  it("should use storage when available and token is invalid", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(GetCookie, "getCookie").mockReturnValue(null);
    await storage.setSessionItem(StorageKeys.accessToken, "expired-token");

    await CheckAuth.checkAuth({ domain, clientId });

    expect(RefreshToken.refreshToken).toHaveBeenCalled();
  });

  // add a test for when storage is available and the token is expired
  it("return from storage when available and token is valid", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(hasTokenExpired, "isTokenExpired").mockResolvedValue(false);
    vi.spyOn(GetCookie, "getCookie").mockReturnValue(null);
    const date = new Date();
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ exp: date.getTime() }),
    );
    await storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ exp: date.getTime() }),
    );
    await storage.setSessionItem(
      StorageKeys.refreshToken,
      createMockAccessToken({ exp: date.getTime() }),
    );

    await CheckAuth.checkAuth({ domain, clientId });

    expect(RefreshToken.refreshToken).not.toHaveBeenCalled();
  });

  it("should use storage when available and token is expired", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(hasTokenExpired, "isTokenExpired").mockResolvedValue(true);
    vi.spyOn(GetCookie, "getCookie").mockReturnValue(null);
    const date = new Date();
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ exp: date.getTime() }),
    );
    await storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ exp: date.getTime() }),
    );
    await storage.setSessionItem(
      StorageKeys.refreshToken,
      createMockAccessToken({ exp: date.getTime() }),
    );

    await CheckAuth.checkAuth({ domain, clientId });

    expect(RefreshToken.refreshToken).toHaveBeenCalled();
  });

  it("should only check if expired if storage is available", async () => {
    vi.spyOn(RefreshToken, "refreshToken").mockResolvedValue({
      success: true,
    });
    vi.spyOn(GetCookie, "getCookie").mockReturnValue(null);
    vi.spyOn(hasTokenExpired, "isTokenExpired");
    await CheckAuth.checkAuth({ domain, clientId });

    expect(hasTokenExpired.isTokenExpired).not.toHaveBeenCalled();
  });
});
