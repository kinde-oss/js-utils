import { getActiveStorage, getInsecureStorage } from "../main.js";
import { storageSettings } from "../sessionManager/index.js";
import {
  StorageKeys,
  TimeoutActivityType,
  type SessionManager,
} from "../sessionManager/types.js";

let activityPreWarnTimer: NodeJS.Timeout | null = null;
let activityTimer: NodeJS.Timeout | null = null;

export const updateActivityTimestamp = async (): Promise<void> => {
  const sessionManager = getActiveStorage();
  if (!sessionManager) {
    throw new Error("Session manager not found");
  }

  if (!storageSettings.activityTimeoutMinutes) {
    throw new Error("No activity timeout minutes set");
  }

  if (activityPreWarnTimer) {
    clearTimeout(activityPreWarnTimer);
  }

  if (activityTimer) {
    clearTimeout(activityTimer);
  }

  activityTimer = setTimeout(
    () => {
      sessionManager.destroySession();
      const insecureStorage = getInsecureStorage();
      if (insecureStorage) {
        insecureStorage.destroySession();
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

  const timestamp = Date.now();
  await sessionManager.setSessionItem(StorageKeys.lastActivity, timestamp);
};

/**
 * Creates a proxy around a SessionManager that automatically tracks user activity
 * and enforces inactivity timeouts in middleware environments.
 *
 * @param sessionManager - The base SessionManager to wrap with activity tracking
 * @returns A proxied SessionManager that automatically handles activity tracking
 */
export const sessionManagerActivityProxy = <T extends StorageKeys>(
  storageType: "secure" | "insecure" = "secure",
): SessionManager<T> => {
  const sessionManager = getActiveStorage();
  if (!sessionManager) {
    throw new Error("Session manager not found");
  }

  if (!storageSettings.activityTimeoutMinutes) {
    return sessionManager;
  }

  const proxyHandler = {
    async get(target: SessionManager<T>, prop: string | symbol) {
      await updateActivityTimestamp();
      // can you look at all the properties and pass down the request?
      if (prop in target) {
        return target[prop as keyof SessionManager<T>];
      }
    },
  }

  const secureProxy = new Proxy(sessionManager, proxyHandler);

  const insecureStorage = getInsecureStorage();
  let insecureProxy: SessionManager<T> | null = null;
  if (insecureStorage != null && insecureStorage !== sessionManager) {
    insecureProxy = new Proxy(insecureStorage, proxyHandler);
  }

  if (storageType === "secure") {
    return secureProxy;
  } else if (storageType === "insecure") {
    return insecureProxy || secureProxy;
  } else {
    throw Error("Invalid storage type");
  }
};
