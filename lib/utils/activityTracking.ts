import { getActiveStorage, getInsecureStorage } from "./token";
import { storageSettings } from "../sessionManager/index.js";
import {
  StorageKeys,
  TimeoutActivityType,
  type SessionManager,
} from "../sessionManager/types.js";

let activityPreWarnTimer: NodeJS.Timeout | null = null;
let activityTimer: NodeJS.Timeout | null = null;

export const updateActivityTimestamp = (): void => {
  const sessionManager = getActiveStorage() ?? getInsecureStorage();
  if (!sessionManager) {
    throw new Error("Session manager not found");
  }

  if (!storageSettings.activityTimeoutMinutes) {
    throw new Error("No activity timeout minutes set");
  }

  if (
    storageSettings.activityTimeoutPreWarningMinutes !== undefined &&
    storageSettings.activityTimeoutPreWarningMinutes >=
      storageSettings.activityTimeoutMinutes
  ) {
    throw new Error(
      "activityTimeoutPreWarningMinutes must be less than activityTimeoutMinutes",
    );
  }

  if (activityPreWarnTimer) {
    clearTimeout(activityPreWarnTimer);
  }

  if (activityTimer) {
    clearTimeout(activityTimer);
  }

  activityTimer = setTimeout(
    async () => {
      try {
        await sessionManager.destroySession();
      } catch (error) {
        console.error("Failed to destroy secure session:", error);
      }
      const insecureStorage = getInsecureStorage();
      if (insecureStorage && insecureStorage !== sessionManager) {
        try {
          await insecureStorage.destroySession();
        } catch (error) {
          console.error("Failed to destroy insecure session:", error);
        }
      }
      storageSettings.onActivityTimeout?.(TimeoutActivityType.timeout);
    },
    storageSettings.activityTimeoutMinutes! * 60 * 1000,
  );

  if (storageSettings.activityTimeoutPreWarningMinutes) {
    activityPreWarnTimer = setTimeout(
      () => {
        storageSettings.onActivityTimeout?.(TimeoutActivityType.preWarning);
      },
      storageSettings.activityTimeoutPreWarningMinutes! * 60 * 1000,
    );
  }
};

/**
 * Creates a proxy around a SessionManager that automatically tracks user activity
 * and enforces inactivity timeouts in environments.
 *
 * @param sessionManager - The base SessionManager to wrap with activity tracking
 * @returns A proxied SessionManager that automatically handles activity tracking
 */
export const sessionManagerActivityProxy = <T extends StorageKeys>(
  sessionManager: SessionManager<T>,
): SessionManager<T> => {
  if (!sessionManager) {
    throw new Error("Session manager not found");
  }

  if (!storageSettings.activityTimeoutMinutes) {
    return sessionManager;
  }

  if (
    storageSettings.activityTimeoutPreWarningMinutes !== undefined &&
    storageSettings.activityTimeoutPreWarningMinutes >=
      storageSettings.activityTimeoutMinutes
  ) {
    throw new Error(
      "activityTimeoutPreWarningMinutes must be less than activityTimeoutMinutes",
    );
  }

  const proxyHandler = {
    get(target: SessionManager<T>, prop: string | symbol) {
      updateActivityTimestamp();
      const value = target[prop as keyof SessionManager<T>];
      if (typeof value === "function") {
        return value.bind(target);
      }
      return value;
    },
  };
  return new Proxy(sessionManager, proxyHandler);
};
