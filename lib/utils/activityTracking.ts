import { storageSettings } from "../sessionManager/index.js";
import { StorageKeys, type SessionManager } from "../sessionManager/types.js";

/**
 * Custom error class for activity expiration
 */
export class ActivityExpiredError extends Error {
  constructor(message = "Session expired due to inactivity") {
    super(message);
    this.name = "ActivityExpiredError";
  }
}

/**
 * Creates a proxy around a SessionManager that automatically tracks user activity
 * and enforces inactivity timeouts in middleware environments.
 *
 * @param sessionManager - The base SessionManager to wrap with activity tracking
 * @returns A proxied SessionManager that automatically handles activity tracking
 */
export const createMiddlewareActivityProxy = <T extends string>(
  sessionManager: SessionManager<T>,
): SessionManager<T> => {
  if (!storageSettings.activityTimeoutMinutes) {
    return sessionManager;
  }

  const activityKey = `${storageSettings.keyPrefix}${StorageKeys.lastActivity}`;
  const cleanupActivityData = async (): Promise<void> => {
    try {
      await sessionManager.removeSessionItem(activityKey as T);
    } catch (cleanupError) {
      console.warn(
        "js-utils: Failed to cleanup activity data during expiry:",
        cleanupError,
      );
    }
  };

  const checkActivityExpiry = async (): Promise<void> => {
    const lastActivityValue = await sessionManager.getSessionItem(
      activityKey as T,
    );

    if (lastActivityValue != null) {
      try {
        let lastActivity: number;

        if (typeof lastActivityValue === "string") {
          lastActivity = parseInt(lastActivityValue, 10);
        } else if (typeof lastActivityValue === "number") {
          lastActivity = lastActivityValue;
        } else {
          await cleanupActivityData();
          throw new ActivityExpiredError();
        }

        if (!isNaN(lastActivity)) {
          const timeoutMs = storageSettings.activityTimeoutMinutes! * 60 * 1000;
          const timeSinceLastActivity = Date.now() - lastActivity;

          if (timeSinceLastActivity > timeoutMs) {
            await cleanupActivityData();
            throw new ActivityExpiredError();
          }
        } else {
          await cleanupActivityData();
          throw new ActivityExpiredError();
        }
      } catch (error) {
        if (error instanceof ActivityExpiredError) throw error;
        await cleanupActivityData();
        throw new ActivityExpiredError();
      }
    }
  };

  const updateActivityTimestamp = async (): Promise<void> => {
    const timestamp = Date.now().toString();
    await sessionManager.setSessionItem(activityKey as T, timestamp);
  };

  return new Proxy(sessionManager, {
    get(target, prop) {
      if (prop === "getSessionItem") {
        return async <U = unknown>(itemKey: T | StorageKeys) => {
          await checkActivityExpiry();
          const result = await target.getSessionItem<U>(itemKey);
          await updateActivityTimestamp();
          return result;
        };
      }

      if (prop === "setSessionItem") {
        return async <U = unknown>(itemKey: T | StorageKeys, itemValue: U) => {
          await checkActivityExpiry();
          await target.setSessionItem(itemKey, itemValue);
          await updateActivityTimestamp();
        };
      }

      // Pass through other methods without tracking
      return target[prop as keyof SessionManager<T>];
    },
  });
};
