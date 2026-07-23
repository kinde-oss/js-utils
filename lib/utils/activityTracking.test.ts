import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { storageSettings } from "../sessionManager/index.js";
import { TimeoutActivityType, StorageKeys } from "../sessionManager/types.js";
import { MemoryStorage } from "../sessionManager/stores/memory.js";
import {
  updateActivityTimestamp,
  sessionManagerActivityProxy,
} from "./activityTracking.js";
import {
  setActiveStorage,
  getActiveStorage,
  clearActiveStorage,
  setInsecureStorage,
  clearInsecureStorage,
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
    clearInsecureStorage();
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
    clearInsecureStorage();
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
        expect.any(Object),
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
        expect.any(Object),
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
        expect.objectContaining({
          accessToken: "token123",
        }),
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
        expect.any(Object),
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
        expect.any(Object),
      );
    });

    it("throw proxy create session missing error on creation when missing", () => {
      storageSettings.activityTimeoutMinutes = 30;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => setActiveStorage(null as any)).toThrow(
        "Session manager not found",
      );
    });

    it("should trigger pre-warning callback before timeout", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      storageSettings.activityTimeoutPreWarningMinutes = 25;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      await activeStorage.getSessionItem(StorageKeys.accessToken);

      await vi.advanceTimersByTimeAsync(25 * 60 * 1000 + 1000);
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.preWarning,
      );
      expect(mockOnActivityTimeout).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
        expect.any(Object),
      );
      expect(mockOnActivityTimeout).toHaveBeenCalledTimes(2);
    });

    it("should pass through all session manager methods", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      await expect(
        activeStorage.setSessionItem(StorageKeys.accessToken, "token"),
      ).toBeUndefined();
      await expect(activeStorage.getSessionItem(StorageKeys.accessToken)).toBe(
        "token",
      );
      await expect(
        activeStorage.removeSessionItem(StorageKeys.accessToken),
      ).toBeUndefined();
      await expect(activeStorage.destroySession()).toBeUndefined();
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
      const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
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
        expect.any(Object),
      );
    });

    it("should throw error when no session manager found", () => {
      storageSettings.activityTimeoutMinutes = 30;
      clearActiveStorage();
      clearInsecureStorage();

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

    it("should throw error when pre-warning minutes >= timeout minutes", () => {
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
        expect.any(Object),
      );
    });
  });

  describe("Activity Timeout Behavior", () => {
    it("should fire timeout callbacks only once per inactivity cycle", async () => {
      storageSettings.activityTimeoutMinutes = 0.1; // 6 seconds for fast test
      storageSettings.activityTimeoutPreWarningMinutes = 0.05; // 3 seconds pre-warning

      const destroySessionSpy = vi.spyOn(sessionManager, "destroySession");
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      // Initial activity to start the timer system
      await activeStorage.getSessionItem(StorageKeys.accessToken);

      // Advance to pre-warning
      await vi.advanceTimersByTimeAsync(
        storageSettings.activityTimeoutPreWarningMinutes! * 60 * 1000 + 100,
      );
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.preWarning,
      );
      expect(mockOnActivityTimeout).toHaveBeenCalledTimes(1);

      // Clear mock to track timeout behavior
      mockOnActivityTimeout.mockClear();

      // Advance to timeout
      await vi.advanceTimersByTimeAsync(
        (storageSettings.activityTimeoutMinutes! -
          storageSettings.activityTimeoutPreWarningMinutes!) *
          60 *
          1000 +
          100,
      );

      // Timeout should occur exactly once
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
        expect.any(Object),
      );
      expect(mockOnActivityTimeout).toHaveBeenCalledTimes(1);
      expect(destroySessionSpy).toHaveBeenCalledTimes(1);

      // Clear mocks to verify no additional callbacks occur
      mockOnActivityTimeout.mockClear();
      destroySessionSpy.mockClear();

      // Advance additional time periods - there should be NO more callbacks
      // (this verifies no infinite recursion occurs)
      await vi.advanceTimersByTimeAsync(
        storageSettings.activityTimeoutMinutes! * 60 * 1000 + 100,
      );
      expect(mockOnActivityTimeout).not.toHaveBeenCalled();
      expect(destroySessionSpy).not.toHaveBeenCalled();

      // Verify a third time period as well
      await vi.advanceTimersByTimeAsync(
        storageSettings.activityTimeoutMinutes! * 60 * 1000 + 100,
      );
      expect(mockOnActivityTimeout).not.toHaveBeenCalled();
      expect(destroySessionSpy).not.toHaveBeenCalled();
    });

    it("should trigger activity updates on method property access", () => {
      storageSettings.activityTimeoutMinutes = 5;
      setActiveStorage(sessionManager);
      const activeStorage = sessionManagerActivityProxy(sessionManager);

      const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
      timeoutSpy.mockClear(); // Clear any setup calls

      // Accessing method properties should trigger activity updates
      const methodRef = activeStorage.getSessionItem;
      expect(methodRef).toBeDefined();
      expect(timeoutSpy).toHaveBeenCalledTimes(1);
      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        storageSettings.activityTimeoutMinutes! * 60 * 1000,
      );
    });

    it("should not trigger activity updates when calling destroySession", () => {
      storageSettings.activityTimeoutMinutes = 5;
      setActiveStorage(sessionManager);
      const activeStorage = sessionManagerActivityProxy(sessionManager);

      const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
      timeoutSpy.mockClear();

      // destroySession should not trigger activity updates
      activeStorage.destroySession();
      expect(timeoutSpy).not.toHaveBeenCalled();
    });

    it("should handle pre-warning callback errors gracefully", async () => {
      storageSettings.activityTimeoutMinutes = 0.1; // 6 seconds
      storageSettings.activityTimeoutPreWarningMinutes = 0.05; // 3 seconds

      // Mock callback to throw error
      const throwingCallback = vi.fn().mockImplementation((type) => {
        if (type === TimeoutActivityType.preWarning) {
          throw new Error("Pre-warning callback error");
        }
      });
      storageSettings.onActivityTimeout = throwingCallback;

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      // Trigger activity to start timer
      await activeStorage.getSessionItem(StorageKeys.accessToken);

      // Advance to pre-warning time
      await vi.advanceTimersByTimeAsync(
        storageSettings.activityTimeoutPreWarningMinutes! * 60 * 1000 + 100,
      );

      // Should handle the error gracefully
      expect(throwingCallback).toHaveBeenCalledWith(
        TimeoutActivityType.preWarning,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[activityTimeout] onActivityTimeout(preWarning) threw:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("should pass tokens to timeout callback", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      // Set up tokens in session
      await sessionManager.setSessionItem(
        StorageKeys.accessToken,
        "access-token-123",
      );
      await sessionManager.setSessionItem(StorageKeys.idToken, "id-token-456");
      await sessionManager.setSessionItem(
        StorageKeys.refreshToken,
        "refresh-token-789",
      );

      // Trigger activity
      await activeStorage.getSessionItem(StorageKeys.accessToken);

      // Advance to timeout
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      // Verify callback was called with tokens
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
        expect.objectContaining({
          accessToken: "access-token-123",
          idToken: "id-token-456",
          refreshToken: "refresh-token-789",
        }),
      );
    });

    it("should pass tokens from insecure storage when used", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      const insecureSessionManager = new MemoryStorage<string>();
      setInsecureStorage(insecureSessionManager);

      // Set up tokens in both storages
      await sessionManager.setSessionItem(
        StorageKeys.accessToken,
        "access-token-123",
      );
      await sessionManager.setSessionItem(StorageKeys.idToken, "id-token-456");
      await insecureSessionManager.setSessionItem(
        StorageKeys.refreshToken,
        "refresh-token-789",
      );

      // Trigger activity
      await activeStorage.getSessionItem(StorageKeys.accessToken);

      // Advance to timeout
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      // Verify callback was called with tokens from both storages
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
        expect.objectContaining({
          accessToken: "access-token-123",
          idToken: "id-token-456",
          refreshToken: "refresh-token-789",
        }),
      );
    });

    it("should handle missing tokens gracefully", async () => {
      storageSettings.activityTimeoutMinutes = 30;
      setActiveStorage(sessionManager);
      const activeStorage = getActiveStorage()!;

      // Don't set any tokens

      // Trigger activity
      await activeStorage.getSessionItem(StorageKeys.accessToken);

      // Advance to timeout
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1000);

      // Verify callback was called with empty tokens object
      expect(mockOnActivityTimeout).toHaveBeenCalledWith(
        TimeoutActivityType.timeout,
        expect.objectContaining({
          accessToken: null,
          idToken: null,
          refreshToken: null,
        }),
      );
    });
  });
});
