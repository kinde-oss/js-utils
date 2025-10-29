import { getActiveStorage, getInsecureStorage } from "./token";
import { storageSettings } from "../sessionManager/index.js";
import {
  StorageKeys,
  TimeoutActivityType,
  type SessionManager,
  type TimeoutTokenData,
} from "../sessionManager/types.js";

let activityPreWarnTimer: NodeJS.Timeout | null = null;
let activityTimer: NodeJS.Timeout | null = null;
let isCapturingTokens = false;

export const updateActivityTimestamp = (): void => {
  if (isCapturingTokens) return;

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
      isCapturingTokens = true;

      const tokens: TimeoutTokenData = {
        accessToken: null,
        idToken: null,
        refreshToken: null,
      };

      try {
        const items = await sessionManager.getItems(
          StorageKeys.accessToken,
          StorageKeys.idToken,
          StorageKeys.refreshToken,
        );
        tokens.accessToken = (items[StorageKeys.accessToken] as string) ?? null;
        tokens.idToken = (items[StorageKeys.idToken] as string) ?? null;
        tokens.refreshToken =
          (items[StorageKeys.refreshToken] as string) ?? null;
      } catch (error) {
        console.error("Failed to capture tokens:", error);
      }

      const insecureStorage = getInsecureStorage();
      if (insecureStorage && insecureStorage !== sessionManager) {
        try {
          const items = await insecureStorage.getItems(
            StorageKeys.refreshToken,
          );
          tokens.refreshToken =
            (items[StorageKeys.refreshToken] as string) ?? null;
        } catch (error) {
          console.error(
            "Failed to capture refresh token from insecure storage:",
            error,
          );
        }
      }

      isCapturingTokens = false;

      try {
        await sessionManager.destroySession();
      } catch (error) {
        console.error("Failed to destroy secure session:", error);
      }
      if (insecureStorage && insecureStorage !== sessionManager) {
        try {
          await insecureStorage.destroySession();
        } catch (error) {
          console.error("Failed to destroy insecure session:", error);
        }
      }

      try {
        storageSettings.onActivityTimeout?.(
          TimeoutActivityType.timeout,
          tokens,
        );
      } catch (err) {
        console.error(
          "[activityTimeout] onActivityTimeout(timeout) threw:",
          err,
        );
      }
    },
    storageSettings.activityTimeoutMinutes! * 60 * 1000,
  );

  if (storageSettings.activityTimeoutPreWarningMinutes !== undefined) {
    activityPreWarnTimer = setTimeout(
      () => {
        try {
          storageSettings.onActivityTimeout?.(TimeoutActivityType.preWarning);
        } catch (err) {
          console.error(
            "[activityTimeout] onActivityTimeout(preWarning) threw:",
            err,
          );
        }
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
      const value = target[prop as keyof SessionManager<T>];
      if (typeof value === "function") {
        if (prop !== "destroySession") {
          updateActivityTimestamp();
        }
        return value.bind(target);
      }
      return value;
    },
  };
  return new Proxy(sessionManager, proxyHandler);
};
