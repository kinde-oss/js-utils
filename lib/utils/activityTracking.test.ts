import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { storageSettings } from "../sessionManager/index.js";
import { TimeoutActivityType, StorageKeys } from "../sessionManager/types.js";
import { MemoryStorage } from "../sessionManager/stores/memory.js";
import { updateActivityTimestamp } from "./activityTracking.js";
import {
  setActiveStorage,
  getActiveStorage,
  clearActiveStorage,
  setInsecureStorage,
} from "./token/index.js";

describe("Activity Tracking", () => {
  let sessionManager: MemoryStorage<string>;
  let originalTimeoutMinutes: number | undefined;
  let originalPreWarningMinutes: number | undefined;
  let originalKeyPrefix: string;
  let originalOnActivityTimeout:
    | ((type: TimeoutActivityType) => void)
    | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockOnActivityTimeout: any;

  beforeEach(() => {
    sessionManager = new MemoryStorage<string>();
    originalTimeoutMinutes = storageSettings.activityTimeoutMinutes;
    originalPreWarningMinutes =
      storageSettings.activityTimeoutPreWarningMinutes;
    originalKeyPrefix = storageSettings.keyPrefix;
    originalOnActivityTimeout = storageSettings.onActivityTimeout;

    storageSettings.activityTimeoutMinutes = undefined;
    storageSettings.activityTimeoutPreWarningMinutes = undefined;
    storageSettings.keyPrefix = "test_";

    mockOnActivityTimeout = vi.fn();
    storageSettings.onActivityTimeout = mockOnActivityTimeout;

    clearActiveStorage();
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    storageSettings.activityTimeoutMinutes = originalTimeoutMinutes;
    storageSettings.activityTimeoutPreWarningMinutes =
      originalPreWarningMinutes;
    storageSettings.keyPrefix = originalKeyPrefix;
    storageSettings.onActivityTimeout = originalOnActivityTimeout;
    clearActiveStorage();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("sessionManagerActivityProxy", () => {
    it("should return original session manager when activity tracking is disabled", () => {
      storageSettings.activityTimeoutMinutes = undefined;
      setActiveStorage(sessionManager);

      const activeStorage = getActiveStorage();

      expect(activeStorage).toBe(sessionManager);
    });

    it("should trigger timeout callback when timer expires", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);

      const activeStorage = getActiveStorage()!;

      await activeStorage.getSessionItem(StorageKeys.accessToken);

      // Advance time and wait for async operations to complete
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
      );
      expect(mockOnActivityTimeout).toHaveBeenCalledTimes(1);
    });

    it("should reset activity timer on new activity", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      await activeStorage.getSessionItem(StorageKeys.accessToken);
      vi.advanceTimersByTime(20 * 60 * 1000);

      await activeStorage.setSessionItem(
        StorageKeys.refreshToken,
        "refresh123",
      );

      vi.advanceTimersByTime(15 * 60 * 1000);
      expect(mockOnActivityTimeout).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 1000);
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
      );
    });

    it("should destroy session when timeout occurs", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      await sessionManager.setSessionItem(StorageKeys.accessToken, "token123");
      const destroySpy = vi.spyOn(sessionManager, "destroySession");

      await activeStorage.getSessionItem(StorageKeys.accessToken);
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      expect(destroySpy).toHaveBeenCalledTimes(1);
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
      );
    });

    it("should destroy insecure session when timeout occurs", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      const insecureSessionManager = new MemoryStorage<string>();
      setInsecureStorage(insecureSessionManager);

      await insecureSessionManager.setSessionItem(
        StorageKeys.accessToken,
        "token123",
      );
      const insecureDestroySpy = vi.spyOn(
        insecureSessionManager,
        "destroySession",
      );

      await activeStorage.getSessionItem(StorageKeys.accessToken);
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      expect(insecureDestroySpy).toHaveBeenCalledTimes(1);
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
      );
    });

    it("should destroy insecure session when destroy errors", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      const insecureSessionManager = new MemoryStorage<string>();
      setInsecureStorage(insecureSessionManager);
      insecureSessionManager.destroySession = vi
        .fn()
        .mockRejectedValue(new Error("Destroy failed"));

      await insecureSessionManager.setSessionItem(
        StorageKeys.accessToken,
        "token123",
      );
      const insecureDestroySpy = vi.spyOn(
        insecureSessionManager,
        "destroySession",
      );

      await activeStorage.getSessionItem(StorageKeys.accessToken);
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      expect(insecureDestroySpy).toHaveBeenCalledTimes(1);

      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
      );
    });

    it("throw proxy create session missing error on creation when missing", () => {
      storageSettings.activityTimeoutMinutes = 30;
      expect(() => setActiveStorage(null)).toThrow("Session manager not found");
    });

    it("should trigger pre-warning callback before timeout", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      storageSettings.activityTimeoutPreWarningMinutes = 25;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      await activeStorage.getSessionItem(StorageKeys.accessToken);

      vi.advanceTimersByTime(25 * 60 * 1000 + 1000);
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.preWarning,
      );
      expect(mockOnActivityTimeout).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
      );
      expect(mockOnActivityTimeout).toHaveBeenCalledTimes(2);
    });

    it("should pass through all session manager methods", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      await expect(
        activeStorage.setSessionItem(StorageKeys.accessToken, "token"),
      ).resolves.not.toThrow();
      await expect(
        activeStorage.getSessionItem(StorageKeys.accessToken),
      ).resolves.toBe("token");
      await expect(
        activeStorage.removeSessionItem(StorageKeys.accessToken),
      ).resolves.not.toThrow();
      await expect(activeStorage.destroySession()).resolves.not.toThrow();
    });

    it("should properly bind methods and maintain context", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      // Test that methods maintain their context by working correctly
      const testValue = "test-token-123";
      const testKey = StorageKeys.accessToken;

      // Store a value
      await activeStorage.setSessionItem(testKey, testValue);

      // Retrieve the value - this should work if context is maintained
      const retrievedValue = await activeStorage.getSessionItem(testKey);
      expect(retrievedValue).toBe(testValue);

      // Test that the method can be destructured and still work (tests binding)
      const { getSessionItem } = activeStorage;
      const valueFromDestructured = await getSessionItem(testKey);
      expect(valueFromDestructured).toBe(testValue);

      // Verify activity tracking is called for each method access
      // We expect the timeout to be set after each method call
      const timeoutSpy = vi.spyOn(global, "setTimeout");
      timeoutSpy.mockClear();

      await activeStorage.setSessionItem(StorageKeys.refreshToken, "refresh");
      expect(timeoutSpy).toHaveBeenCalled();

      timeoutSpy.mockClear();
      await activeStorage.getSessionItem(StorageKeys.refreshToken);
      expect(timeoutSpy).toHaveBeenCalled();
    });
  });

  describe("updateActivityTimestamp", () => {
    it("should start timeout timer when called", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);

      updateActivityTimestamp();

      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
      );
    });

    it("should throw error when no session manager found", () => {
      storageSettings.activityTimeoutMinutes = 30;
      clearActiveStorage();

      expect(() => updateActivityTimestamp()).toThrow(
        "Session manager not found",
      );
    });

    it("should throw error when no activity timeout configured", () => {
      storageSettings.activityTimeoutMinutes = undefined;
      setActiveStorage(sessionManager);

      expect(() => updateActivityTimestamp()).toThrow(
        "No activity timeout minutes set",
      );
    });

    it("should throw error when no activity timeout configured", () => {
      setActiveStorage(sessionManager);
      storageSettings.activityTimeoutMinutes = 30;
      storageSettings.activityTimeoutPreWarningMinutes = 31;
      expect(() => updateActivityTimestamp()).toThrow(
        "activityTimeoutPreWarningMinutes must be less than activityTimeoutMinutes",
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle session method errors gracefully", async () => {
      storageSettings.activityTimeoutMinutes = 30;

      const errorSessionManager = {
        getSessionItem: vi.fn().mockRejectedValue(new Error("Storage failed")),
        setSessionItem: vi.fn().mockRejectedValue(new Error("Storage failed")),
        removeSessionItem: vi
          .fn()
          .mockRejectedValue(new Error("Storage failed")),
        destroySession: vi.fn().mockRejectedValue(new Error("Destroy failed")),
        setItems: vi.fn().mockRejectedValue(new Error("Storage failed")),
        removeItems: vi.fn().mockRejectedValue(new Error("Storage failed")),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setActiveStorage(errorSessionManager as any);
      const activeStorage = getActiveStorage()!;

      await expect(
        activeStorage.getSessionItem(StorageKeys.accessToken),
      ).rejects.toThrow("Storage failed");

      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
      );
    });
  });
});
