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
};

export { MemoryStorage } from "./stores/memory.ts";
export { ChromeStore } from "./stores/chromeStore.ts";
export { ExpoSecureStore } from "./stores/expoSecureStore.ts";
export { LocalStorage } from "./stores/localStorage.ts";
export * from "./types.ts";
