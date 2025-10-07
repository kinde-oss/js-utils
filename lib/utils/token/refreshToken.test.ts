import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MemoryStorage,
  StorageKeys,
  storageSettings,
} from "../../sessionManager";
import * as tokenUtils from ".";
import * as refreshTimer from "../refreshTimer";
import { createMockAccessToken } from "./testUtils";
import * as isClient from "../isClient";

describe("refreshToken", () => {
  const mockDomain = "https://example.com";
  const mockKindeDomain = "https://example.kinde.com";
  const mockClientId = "test-client-id";
  const mockRefreshTokenValue = "mock-refresh-token";
  const memoryStorage = new MemoryStorage();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue(null);
    vi.spyOn(memoryStorage, "setSessionItem");
    vi.spyOn(refreshTimer, "setRefreshTimer");
    vi.spyOn(tokenUtils, "refreshToken");
    tokenUtils.setActiveStorage(memoryStorage);
    global.fetch = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    memoryStorage.destroySession();
    vi.restoreAllMocks();
  });

  it("should return false if domain is not provided", async () => {
    const result = await tokenUtils.refreshToken({
      domain: "",
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "Domain is required for token refresh",
      success: false,
    });
  });

  it("should return false if clientId is not provided", async () => {
    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: "",
    });
    expect(result).toStrictEqual({
      error: "Client ID is required for token refresh",
      success: false,
    });
  });

  it("no active storage should error", async () => {
    tokenUtils.clearActiveStorage();
    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "No active storage found",
      success: false,
    });
  });

  it("should return false if no refresh token is found", async () => {
    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "No refresh token found",
      success: false,
    });
  });

  it("should return false if the fetch request fails", async () => {
    await memoryStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "No access token received: Error: Network error",
      success: false,
    });
  });

  it("should return false if the response is not ok", async () => {
    await memoryStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );
    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "Failed to refresh token",
      success: false,
    });
  });

  it("should return false if the response does not contain an access token", async () => {
    await memoryStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "No access token received",
      success: false,
    });
  });

  it("should return true and update tokens if the refresh is successful", async () => {
    const callback = vi.fn();

    const mockResponse = {
      access_token: "new-access-token",
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
    };
    memoryStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockKindeDomain,
      clientId: mockClientId,
      onRefresh: callback,
    });

    expect(result).toStrictEqual({
      success: true,
      accessToken: "new-access-token",
      idToken: "new-id-token",
      refreshToken: "new-refresh-token",
    });
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.accessToken,
      "new-access-token",
    );
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.idToken,
      "new-id-token",
    );
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.refreshToken,
      "new-refresh-token",
    );

    // callback was called
    expect(callback).toHaveBeenCalled();
  });

  it("should use sanitizeUrl for the domain", async () => {
    memoryStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: "new-token" }),
    } as Response);

    await tokenUtils.refreshToken({
      domain: "https://example.com/",
      clientId: mockClientId,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`https://example.com/oauth2/token`),
      expect.any(Object),
    );
  });

  it("should use insecure storage for refresh token if useInsecureForRefreshToken is true", async () => {
    const mockResponse = {
      access_token: "new-access-token",
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
    };
    storageSettings.useInsecureForRefreshToken = true;

    const insecureStorage = new MemoryStorage();

    tokenUtils.setInsecureStorage(insecureStorage);
    await insecureStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );
    vi.spyOn(insecureStorage, "setSessionItem");
    memoryStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });

    expect(result).toStrictEqual({
      success: true,
      accessToken: "new-access-token",
      idToken: "new-id-token",
      refreshToken: "new-refresh-token",
    });
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.accessToken,
      "new-access-token",
    );
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.idToken,
      "new-id-token",
    );
    expect(insecureStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.refreshToken,
      "new-refresh-token",
    );
    expect(memoryStorage.setSessionItem).not.toHaveBeenCalledWith(
      StorageKeys.refreshToken,
      "new-refresh-token",
    );

    // reset storageSettings to default
    storageSettings.useInsecureForRefreshToken = false;
  });

  it("raise error when no session storage is found when useInsecureForRefreshToken", async () => {
    const mockResponse = {
      access_token: "new-access-token",
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
    };
    storageSettings.useInsecureForRefreshToken = true;

    tokenUtils.clearActiveStorage();

    const insecureStorage = new MemoryStorage();
    tokenUtils.setInsecureStorage(insecureStorage);
    await insecureStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });

    expect(result).toStrictEqual({
      error: "No active storage found",
      success: false,
    });

    storageSettings.useInsecureForRefreshToken = false;
  });

  it("triggers new timer when expires_in supplied and calls refreshToken", async () => {
    vi.useFakeTimers();
    const mockResponse = {
      access_token: "new-access-token",
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
      expires_in: 1000,
    };
    vi.spyOn(isClient, "isClient").mockResolvedValue(true);

    const insecureStorage = new MemoryStorage();
    tokenUtils.setInsecureStorage(insecureStorage);
    await insecureStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockKindeDomain,
      clientId: mockClientId,
    });

    expect(refreshTimer.setRefreshTimer).toHaveBeenCalledWith(
      1000,
      expect.any(Function),
    );
    vi.runAllTimers();
    expect(tokenUtils.refreshToken).toHaveBeenCalledWith({
      domain: mockKindeDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      accessToken: "new-access-token",
      idToken: "new-id-token",
      refreshToken: "new-refresh-token",
      success: true,
    });
  });

  describe("onRefreshHandler functionality", () => {
    beforeEach(() => {
      // Reset storageSettings to ensure clean state
      storageSettings.onRefreshHandler = undefined;
    });

    afterEach(() => {
      // Clean up storageSettings after each test
      storageSettings.onRefreshHandler = undefined;
    });

    it("should use onRefreshHandler instead of fetch when set", async () => {
      const mockOnRefreshHandler = vi.fn().mockResolvedValue({
        success: true,
        accessToken: createMockAccessToken({ exp: 1000 }),
        idToken: "handler-id-token",
        refreshToken: "handler-refresh-token",
      });

      storageSettings.onRefreshHandler = mockOnRefreshHandler;

      const result = await tokenUtils.refreshToken({
        domain: mockDomain,
        clientId: mockClientId,
        refreshType: 1, // RefreshType.cookie - this skips the refresh token check
      });

      // Verify onRefreshHandler was called with correct refreshType
      expect(mockOnRefreshHandler).toHaveBeenCalledWith(1); // RefreshType.cookie = 1

      // Verify fetch was not called
      expect(global.fetch).not.toHaveBeenCalled();

      // Verify the result from onRefreshHandler is returned
      expect(result).toStrictEqual({
        success: true,
        accessToken:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOltdLCJhenAiOiJiOWRhMThjNDQxYjQ0ZDgxYmFiM2U4MjMyZGUyZTE4ZCIsImJpbGxpbmciOnsiaGFzX3BheW1lbnRfZGV0YWlscyI6ZmFsc2V9LCJleHAiOjEwMDAsImlhdCI6MTE2ODMzNTcyMDAwMCwiaXNzIjoiaHR0cHM6Ly9raW5kZS5jb20iLCJqdGkiOiIyN2RhYTEyNS0yZmIyLTRlMTQtOTI3MC03NDJjZDU2ZTc2NGIiLCJvcmdfY29kZSI6Im9yZ18xMjM0NTY3ODkiLCJzY3AiOlsib3BlbmlkIiwicHJvZmlsZSIsImVtYWlsIiwib2ZmbGluZSJdLCJzdWIiOiJrcF9jZmNiMWFlNWI5MjU0YWQ5OTUyMTIxNDAxNGM1NGY0MyJ9.gtSHqb04MR1ul0kiS_mVDLY_02HbwjEPNI9koRCoDNw",
        idToken: "handler-id-token",
        refreshToken: "handler-refresh-token",
      });

      // Verify tokens are stored in session
      expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
        StorageKeys.accessToken,
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOltdLCJhenAiOiJiOWRhMThjNDQxYjQ0ZDgxYmFiM2U4MjMyZGUyZTE4ZCIsImJpbGxpbmciOnsiaGFzX3BheW1lbnRfZGV0YWlscyI6ZmFsc2V9LCJleHAiOjEwMDAsImlhdCI6MTE2ODMzNTcyMDAwMCwiaXNzIjoiaHR0cHM6Ly9raW5kZS5jb20iLCJqdGkiOiIyN2RhYTEyNS0yZmIyLTRlMTQtOTI3MC03NDJjZDU2ZTc2NGIiLCJvcmdfY29kZSI6Im9yZ18xMjM0NTY3ODkiLCJzY3AiOlsib3BlbmlkIiwicHJvZmlsZSIsImVtYWlsIiwib2ZmbGluZSJdLCJzdWIiOiJrcF9jZmNiMWFlNWI5MjU0YWQ5OTUyMTIxNDAxNGM1NGY0MyJ9.gtSHqb04MR1ul0kiS_mVDLY_02HbwjEPNI9koRCoDNw",
      );
      expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
        StorageKeys.idToken,
        "handler-id-token",
      );
      expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
        StorageKeys.refreshToken,
        "handler-refresh-token",
      );
    });

    it("should handle onRefreshHandler error result", async () => {
      const mockOnRefreshHandler = vi.fn().mockResolvedValue({
        success: false,
        error: "Handler refresh failed",
      });

      storageSettings.onRefreshHandler = mockOnRefreshHandler;

      const result = await tokenUtils.refreshToken({
        domain: mockDomain,
        clientId: mockClientId,
        refreshType: 1, // RefreshType.cookie - this skips the refresh token check
      });

      // Verify onRefreshHandler was called
      expect(mockOnRefreshHandler).toHaveBeenCalledWith(1);

      // Verify fetch was not called
      expect(global.fetch).not.toHaveBeenCalled();

      // Verify error result is returned
      expect(result).toStrictEqual({
        success: false,
        error: "No access token received",
      });

      // Verify no tokens are stored on error
      expect(memoryStorage.setSessionItem).not.toHaveBeenCalledWith(
        StorageKeys.accessToken,
        expect.any(String),
      );
    });

    it("should call onRefresh callback when onRefreshHandler is used", async () => {
      const mockOnRefreshHandler = vi.fn().mockResolvedValue({
        success: true,
        accessToken: "handler-access-token",
        idToken: "handler-id-token",
        refreshToken: "handler-refresh-token",
      });

      const mockOnRefreshCallback = vi.fn();

      storageSettings.onRefreshHandler = mockOnRefreshHandler;

      const result = await tokenUtils.refreshToken({
        domain: mockDomain,
        clientId: mockClientId,
        refreshType: 1, // RefreshType.cookie - this skips the refresh token check
        onRefresh: mockOnRefreshCallback,
      });

      // Verify onRefresh callback was called with the result
      expect(mockOnRefreshCallback).toHaveBeenCalledWith({
        success: true,
        accessToken: "handler-access-token",
        idToken: "handler-id-token",
        refreshToken: "handler-refresh-token",
      });

      // Verify the result is still returned correctly
      expect(result).toStrictEqual({
        success: true,
        accessToken: "handler-access-token",
        idToken: "handler-id-token",
        refreshToken: "handler-refresh-token",
      });
    });

    it("should use onRefreshHandler with cookie refresh type", async () => {
      const mockOnRefreshHandler = vi.fn().mockResolvedValue({
        success: true,
        accessToken: "cookie-access-token",
        idToken: "cookie-id-token",
        refreshToken: "cookie-refresh-token",
      });

      storageSettings.onRefreshHandler = mockOnRefreshHandler;

      const result = await tokenUtils.refreshToken({
        domain: mockDomain,
        clientId: mockClientId,
        refreshType: 1, // RefreshType.cookie
      });

      // Verify onRefreshHandler was called with cookie refresh type
      expect(mockOnRefreshHandler).toHaveBeenCalledWith(1); // RefreshType.cookie = 1

      // Verify fetch was not called
      expect(global.fetch).not.toHaveBeenCalled();

      // Verify the result from onRefreshHandler is returned
      expect(result).toStrictEqual({
        success: true,
        accessToken: "cookie-access-token",
        idToken: "cookie-id-token",
        refreshToken: "cookie-refresh-token",
      });
    });

    it("should handle onRefreshHandler throwing an error", async () => {
      const mockOnRefreshHandler = vi
        .fn()
        .mockRejectedValue(new Error("Handler error"));

      storageSettings.onRefreshHandler = mockOnRefreshHandler;

      const result = await tokenUtils.refreshToken({
        domain: mockDomain,
        clientId: mockClientId,
        refreshType: 1, // RefreshType.cookie - this skips the refresh token check
      });

      // Verify onRefreshHandler was called
      expect(mockOnRefreshHandler).toHaveBeenCalledWith(1);

      // Verify fetch was not called
      expect(global.fetch).not.toHaveBeenCalled();

      // Verify error is caught and returned
      expect(result).toStrictEqual({
        success: false,
        error: "No access token received: Error: Handler error",
      });
    });

    it("should start refresh timer when onRefreshHandler returns successful result", async () => {
      vi.useFakeTimers();

      const mockOnRefreshHandler = vi.fn().mockResolvedValue({
        success: true,
        accessToken: createMockAccessToken({ exp: 1000 }),
        idToken: "handler-id-token",
        refreshToken: "handler-refresh-token",
      });

      // Mock getClaim to return an exp value that's in the future
      const futureExp = Math.floor(Date.now() / 1000) + 1000; // 1000 seconds in the future
      vi.spyOn(tokenUtils, "getClaim").mockResolvedValue({
        name: "exp",
        value: futureExp,
      });

      storageSettings.onRefreshHandler = mockOnRefreshHandler;

      const result = await tokenUtils.refreshToken({
        domain: mockDomain,
        clientId: mockClientId,
        refreshType: 1, // RefreshType.cookie - this skips the refresh token check
      });

      // Verify onRefreshHandler was called
      expect(mockOnRefreshHandler).toHaveBeenCalledWith(1);

      // Verify fetch was not called
      expect(global.fetch).not.toHaveBeenCalled();

      // Verify refresh timer was set
      expect(refreshTimer.setRefreshTimer).toHaveBeenCalledWith(
        1000,
        expect.any(Function),
      );

      // Verify the result is returned correctly
      expect(result).toStrictEqual({
        success: true,
        accessToken:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOltdLCJhenAiOiJiOWRhMThjNDQxYjQ0ZDgxYmFiM2U4MjMyZGUyZTE4ZCIsImJpbGxpbmciOnsiaGFzX3BheW1lbnRfZGV0YWlscyI6ZmFsc2V9LCJleHAiOjEwMDAsImlhdCI6MTE2ODMzNTcyMDAwMCwiaXNzIjoiaHR0cHM6Ly9raW5kZS5jb20iLCJqdGkiOiIyN2RhYTEyNS0yZmIyLTRlMTQtOTI3MC03NDJjZDU2ZTc2NGIiLCJvcmdfY29kZSI6Im9yZ18xMjM0NTY3ODkiLCJzY3AiOlsib3BlbmlkIiwicHJvZmlsZSIsImVtYWlsIiwib2ZmbGluZSJdLCJzdWIiOiJrcF9jZmNiMWFlNWI5MjU0YWQ5OTUyMTIxNDAxNGM1NGY0MyJ9.gtSHqb04MR1ul0kiS_mVDLY_02HbwjEPNI9koRCoDNw",
        idToken: "handler-id-token",
        refreshToken: "handler-refresh-token",
      });

      // Test that the timer callback works
      vi.runAllTimers();
      expect(tokenUtils.refreshToken).toHaveBeenCalledWith({
        domain: mockDomain,
        clientId: mockClientId,
        refreshType: 1,
      });
    });
  });
});
