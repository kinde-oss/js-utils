import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { storageSettings } from "../sessionManager/index.js";
import { StorageKeys } from "../sessionManager/types.js";
import { MemoryStorage } from "../sessionManager/stores/memory.js";
import {
  ActivityExpiredError,
} from "./activityTracking.js";

describe("Activity Tracking", () => {
  let sessionManager: MemoryStorage<string>;
  let originalTimeoutMinutes: number | undefined;
  let originalKeyPrefix: string;

  beforeEach(() => {
    sessionManager = new MemoryStorage<string>();
    originalTimeoutMinutes = storageSettings.activityTimeoutMinutes;
    originalKeyPrefix = storageSettings.keyPrefix;
    storageSettings.activityTimeoutMinutes = undefined;
    storageSettings.keyPrefix = "test_";
    vi.clearAllMocks();
  });

  afterEach(() => {
    storageSettings.activityTimeoutMinutes = originalTimeoutMinutes;
    storageSettings.keyPrefix = originalKeyPrefix;
  });

  const getLastActivity = async () => {
    const activityKey = `${storageSettings.keyPrefix}${StorageKeys.lastActivity}`;
    const value = await sessionManager.getSessionItem(activityKey as string);
    if (!value) return null;

    let timestamp: number;
    if (typeof value === "string") {
      timestamp = parseInt(value, 10);
    } else if (typeof value === "number") {
      timestamp = value;
    } else {
      return null;
    }

    return isNaN(timestamp) ? null : timestamp;
  };

  describe("createMiddlewareActivityProxy", () => {
    it("should return original session manager when activity tracking is disabled", () => {
      storageSettings.activityTimeoutMinutes = undefined;

      const proxy = getActiveStorage();

      expect(proxy).toBe(sessionManager);
    });

    it("should throw ActivityExpiredError when session is expired on getSessionItem", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      const mockTime = 1000000;
      vi.spyOn(Date, "now").mockReturnValue(mockTime);

      // Set an old activity timestamp directly using prefixed key
      const activityKey = `${storageSettings.keyPrefix}${StorageKeys.lastActivity}`;
      await sessionManager.setSessionItem(
        activityKey as string,
        mockTime.toString(),
      );

      // Move time forward beyond timeout
      vi.spyOn(Date, "now").mockReturnValue(mockTime + 45 * 60 * 1000);

      const proxy = createMiddlewareActivityProxy(sessionManager);

      await expect(proxy.getSessionItem("accessToken")).rejects.toThrow(
        ActivityExpiredError,
      );
    });

    it("should throw ActivityExpiredError when session is expired on setSessionItem", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      const mockTime = 1000000;
      vi.spyOn(Date, "now").mockReturnValue(mockTime);

      // Set an old activity timestamp directly using prefixed key
      const activityKey = `${storageSettings.keyPrefix}${StorageKeys.lastActivity}`;
      await sessionManager.setSessionItem(
        activityKey as string,
        mockTime.toString(),
      );

      // Move time forward beyond timeout
      vi.spyOn(Date, "now").mockReturnValue(mockTime + 45 * 60 * 1000);

      const proxy = createMiddlewareActivityProxy(sessionManager);

      await expect(
        proxy.setSessionItem("accessToken", "token123"),
      ).rejects.toThrow(ActivityExpiredError);
    });

    it("should update activity timestamp on successful getSessionItem", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      const startTime = 1000000;
      vi.spyOn(Date, "now").mockReturnValue(startTime);

      const proxy = createMiddlewareActivityProxy(sessionManager);

      // Set initial data
      await sessionManager.setSessionItem("accessToken", "token123");

      // Move time forward but within timeout
      const laterTime = startTime + 10 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(laterTime);

      await proxy.getSessionItem("accessToken");

      const lastActivity = await getLastActivity();
      expect(lastActivity).toBe(laterTime);
    });

    it("should update activity timestamp on successful setSessionItem", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      const startTime = 1000000;
      vi.spyOn(Date, "now").mockReturnValue(startTime);

      const proxy = createMiddlewareActivityProxy(sessionManager);

      // Move time forward
      const laterTime = startTime + 10 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(laterTime);

      await proxy.setSessionItem("accessToken", "token123");

      const lastActivity = await getLastActivity();
      expect(lastActivity).toBe(laterTime);
    });

    it("should pass through other methods without tracking", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      const proxy = createMiddlewareActivityProxy(sessionManager);

      await expect(proxy.destroySession()).resolves.not.toThrow();
      await expect(proxy.removeSessionItem("someKey")).resolves.not.toThrow();
    });

    it("should handle fresh session (no activity) without throwing", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      const proxy = createMiddlewareActivityProxy(sessionManager);

      // Fresh session - should not throw and should update activity
      const result = await proxy.getSessionItem("accessToken");
      expect(result).toBeNull();

      const lastActivity = await getLastActivity();
      expect(lastActivity).toBeTruthy();
    });

    it("should throw ActivityExpiredError for invalid timestamp", async () => {
      storageSettings.activityTimeoutMinutes = 30;

      // Set invalid timestamp using the prefixed key that our implementation uses
      const activityKey = `${storageSettings.keyPrefix}${StorageKeys.lastActivity}`;
      await sessionManager.setSessionItem(
        activityKey as string,
        "invalid-timestamp",
      );

      const proxy = createMiddlewareActivityProxy(sessionManager);

      await expect(proxy.getSessionItem("accessToken")).rejects.toThrow(
        ActivityExpiredError,
      );
    });

    it("should clean up activity data when session expires", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      const mockTime = 1000000;
      vi.spyOn(Date, "now").mockReturnValue(mockTime);

      const activityKey = `${storageSettings.keyPrefix}${StorageKeys.lastActivity}`;
      await sessionManager.setSessionItem(
        activityKey as string,
        mockTime.toString(),
      );

      // Verify activity data exists
      let activityValue = await getLastActivity();
      expect(activityValue).toBe(mockTime);

      // Move time forward beyond timeout
      vi.spyOn(Date, "now").mockReturnValue(mockTime + 45 * 60 * 1000);

      const proxy = createMiddlewareActivityProxy(sessionManager);

      // Should throw and clean up activity data
      await expect(proxy.getSessionItem("accessToken")).rejects.toThrow(
        ActivityExpiredError,
      );

      // Verify activity data was cleaned up
      activityValue = await getLastActivity();
      expect(activityValue).toBeNull();
    });

    it("should clean up activity data when invalid timestamp detected", async () => {
      storageSettings.activityTimeoutMinutes = 30;

      const activityKey = `${storageSettings.keyPrefix}${StorageKeys.lastActivity}`;
      await sessionManager.setSessionItem(
        activityKey as string,
        "invalid-timestamp",
      );

      // Verify invalid activity data exists
      const rawValue = await sessionManager.getSessionItem(
        activityKey as string,
      );
      expect(rawValue).toBe("invalid-timestamp");

      const proxy = createMiddlewareActivityProxy(sessionManager);

      // Should throw and clean up activity data
      await expect(proxy.getSessionItem("accessToken")).rejects.toThrow(
        ActivityExpiredError,
      );

      // Verify activity data was cleaned up
      const cleanedValue = await sessionManager.getSessionItem(
        activityKey as string,
      );
      expect(cleanedValue).toBeNull();
    });
  });
});
