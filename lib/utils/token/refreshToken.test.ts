import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionManager, StorageKeys } from "../../sessionManager";
import * as tokenUtils from ".";

describe("refreshToken", () => {
  const mockDomain = "https://example.com";
  const mockClientId = "test-client-id";
  const mockRefreshTokenValue = "mock-refresh-token";
  const mockStorage: SessionManager = {
    getSessionItem: vi.fn(),
    setSessionItem: vi.fn(),
    removeSessionItem: vi.fn(),
    destroySession: vi.fn(),
    setItems: vi.fn(),
    removeItems: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue(null);
    vi.spyOn(tokenUtils, "getActiveStorage").mockResolvedValue(mockStorage);
    // vi.spyOn(Utils, 'sanitizeUrl').mockImplementation((url) => url);
    global.fetch = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return false if domain is not provided", async () => {
    const result = await tokenUtils.refreshToken("", mockClientId);
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "Domain is required for token refresh",
    );
  });

  it("should return false if clientId is not provided", async () => {
    const result = await tokenUtils.refreshToken(mockDomain, "");
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "Client ID is required for token refresh",
    );
  });

  it("should return false if no refresh token is found", async () => {
    // mockStorage.getSessionItem.mockResolvedValue(null);
    const result = await tokenUtils.refreshToken(mockDomain, mockClientId);
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith("No refresh token found");
  });

  it("should return false if the fetch request fails", async () => {
    mockStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));
    const result = await tokenUtils.refreshToken(mockDomain, mockClientId);
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "Error refreshing token:",
      expect.any(Error),
    );
  });

  it("should return false if the response is not ok", async () => {
    mockStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);
    const result = await tokenUtils.refreshToken(mockDomain, mockClientId);
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith("Failed to refresh token");
  });

  it("should return false if the response does not contain an access token", async () => {
    mockStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);
    const result = await tokenUtils.refreshToken(mockDomain, mockClientId);
    expect(result).toBe(false);
  });

  it("should return true and update tokens if the refresh is successful", async () => {
    const mockResponse = {
      access_token: "new-access-token",
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
    };
    mockStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await tokenUtils.refreshToken(mockDomain, mockClientId);

    expect(result).toBe(true);
    expect(mockStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.accessToken,
      "new-access-token",
    );
    expect(mockStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.idToken,
      "new-id-token",
    );
    expect(mockStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.refreshToken,
      "new-refresh-token",
    );
  });

  it("should use sanitizeUrl for the domain", async () => {
    mockStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: "new-token" }),
    } as Response);

    await tokenUtils.refreshToken("https://example.com/", mockClientId);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`https://example.com/oauth2/token`),
      expect.any(Object),
    );
  });
});
