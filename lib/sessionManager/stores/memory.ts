import { storageSettings } from "../index.js";
import { SessionBase, StorageKeys, type SessionManager } from "../types.js";
import { splitString } from "../../utils/splitString.js";

/**
 * Provides a memory based session manager implementation for the browser.
 * @class MemoryStorage
 */
export class MemoryStorage<V extends string = StorageKeys>
  extends SessionBase<V>
  implements SessionManager<V>
{
  asyncStore = false;
  private memCache: Record<string, unknown> = {};

  /**
   * Clears all items from session store.
   * @returns {void}
   */
  destroySession(): void {
    this.memCache = {};
    this.notifyListeners();
  }

  /**
   * Sets the provided key-value store to the memory cache.
   * @param {string} itemKey
   * @param {unknown} itemValue
   * @returns {void}
   */
  setSessionItem(itemKey: V | StorageKeys, itemValue: unknown): void {
    // clear items first
    this.removeSessionItem(itemKey);

    if (typeof itemValue === "string") {
      splitString(itemValue, storageSettings.maxLength).forEach(
        (splitValue, index) => {
          this.memCache[`${storageSettings.keyPrefix}${itemKey}${index}`] =
            splitValue;
        },
      );
      this.notifyListeners();
      return;
    }
    this.memCache[`${storageSettings.keyPrefix}${String(itemKey)}0`] =
      itemValue;

    this.notifyListeners();
  }

  /**
   * Gets the item for the provided key from the memory cache.
   * @param {string} itemKey
   * @returns {unknown | null}
   */
  getSessionItem(itemKey: V | StorageKeys): unknown | null {
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
  removeSessionItem(itemKey: V | StorageKeys): void {
    // Remove all items with the key prefix
    for (const key in this.memCache) {
      if (key.startsWith(`${storageSettings.keyPrefix}${String(itemKey)}`)) {
        delete this.memCache[key];
      }
    }

    this.notifyListeners();
  }
}
