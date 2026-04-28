import { StorageSettingsType } from "./types.ts";

export const storageSettings: StorageSettingsType = {
  /**
   * The prefix to use for the storage keys.
   */
  keyPrefix: "kinde-",
  /**
   * The maximum length of the storage.
   *
   * If the length is exceeded the items will be split into multiple storage items.
   */
  maxLength: 2000,

  /**
   * Use insecure storage for refresh token.
   *
   * Warning: This should only be used when you're not using a custom domain and no backend app to authenticate on.
   */
  useInsecureForRefreshToken: false,

  /**
   * The number of minutes of inactivity before tokens are considered expired.
   *
   * When undefined, activity tracking is disabled.
   */
  activityTimeoutMinutes: undefined,

  /**
   * The number of minutes of inactivity before a pre-warning is shown.
   *
   * When undefined, pre-warning is disabled.
   */
  activityTimeoutPreWarningMinutes: undefined,

  /**
   * The function to call when the activity timeout is reached.
   *
   * @param timeoutType - The type of timeout that occurred.
   */
  onActivityTimeout: undefined,
};

// Export session manager related items directly
export { MemoryStorage } from "./stores/memory.js";
export { ChromeStore } from "./stores/chromeStore.js";
export { ExpoSecureStore } from "./stores/expoSecureStore.js";
export { LocalStorage } from "./stores/localStorage.ts";
export { ExpressStore } from "./stores/expressStore.ts";

// Export types directly
export { StorageKeys, SessionBase, TimeoutActivityType } from "./types.ts";
export type { SessionManager, TimeoutTokenData } from "./types.ts";
