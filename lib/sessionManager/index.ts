import { StorageSettingsType } from "./types.ts";

export const storageSettings: StorageSettingsType = {
  /**
   * The password to encrypt the store. (cookies only)
   */
  storePassword: "",
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

export { MemoryStorage } from "./stores/memory.js";
export * from "./types.ts";
