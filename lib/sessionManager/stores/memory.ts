import { storageSettings } from "../index.js";
import { SessionBase, StorageKeys, type SessionManager } from "../types.js";
import { splitString } from "../utils.js";

/**
 * Provides a memory based session manager implementation for the browser.
 * @class MemoryStorage
 */
export class MemoryStorage<V extends string = StorageKeys>  extends SessionBase<V> implements SessionManager<V> {
  private memCache: Record<string, unknown> = {};

  /**
   * Clears all items from session store.
   * @returns {void}
   */
  async destroySession(): Promise<void> {
    this.memCache = {};
  }

  /**
   * Sets the provided key-value store to the memory cache.
   * @param {string} itemKey
   * @param {unknown} itemValue
   * @returns {void}
   */
  async setSessionItem(
    itemKey: V | StorageKeys,
    itemValue: unknown,
  ): Promise<void> {
    // clear items first
    await this.removeSessionItem(itemKey);

    if (typeof itemValue === "string") {
      splitString(itemValue, storageSettings.maxLength).forEach(
        (splitValue, index) => {
          this.memCache[`${storageSettings.keyPrefix}${itemKey}${index}`] =
            splitValue;
        },
      );
      return;
    }
    this.memCache[`${storageSettings.keyPrefix}${String(itemKey)}0`] =
      itemValue;
  }

  /**
   * Gets the item for the provided key from the memory cache.
   * @param {string} itemKey
   * @returns {unknown | null}
   */
  async getSessionItem(itemKey: V | StorageKeys): Promise<unknown | null> {
    if (
      this.memCache[`${storageSettings.keyPrefix}${String(itemKey)}0`] ===
      undefined
    ) {
      return null;
    }

    let itemValue = "";
    let index = 0;
    let key = `${storageSettings.keyPrefix}${String(itemKey)}${index}`;
    while (this.memCache[key] !== undefined) {
      itemValue += this.memCache[key];
      index++;
      key = `${storageSettings.keyPrefix}${String(itemKey)}${index}`;
    }

    return itemValue;
  }

  /**
   * Removes the item for the provided key from the memory cache.
   * @param {string} itemKey
   * @returns {void}
   */
  async removeSessionItem(itemKey: V | StorageKeys): Promise<void> {
    // Remove all items with the key prefix
    for (const key in this.memCache) {
      if (key.startsWith(`${storageSettings.keyPrefix}${String(itemKey)}`)) {
        delete this.memCache[key];
      }
    }
  }
}
