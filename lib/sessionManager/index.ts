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
   * If to use the insecure store for refresh token.
   *
   * Note: This should only be used when there is no other secure storage available.
   */
  useInsecureForRefreshToken: false,
};

export { MemoryStorage } from "./stores/memory.js";
export { ChromeStore } from "./stores/chromeStore.js";
export { ExpoSecureStore } from "./stores/expoSecureStore.js";
export { LocalStorage } from "./stores/localStorage.ts";
export { type SessionManager, StorageKeys } from "./types.ts";
