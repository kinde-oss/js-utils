import { storageSettings } from "../index.js";
import { StorageKeys, type SessionManager } from "../types.js";
import { splitString } from "../utils.js";

/**
 * Provides a localStorage based session manager implementation for the browser.
 * @class LocalStorage
 */
export class LocalStorage<V = StorageKeys> implements SessionManager<V> {
  setItems: Set<V | StorageKeys> = new Set<V>();

  /**
   * Clears all items from session store.
   * @returns {void}
   */
  async destroySession(): Promise<void> {
    this.setItems.forEach((key) => {
      this.removeSessionItem(key);
    });
  }

  /**
   * Sets the provided key-value store to the localStorage cache.
   * @param {V} itemKey
   * @param {unknown} itemValue
   * @returns {void}
   */
  async setSessionItem(
    itemKey: V | StorageKeys,
    itemValue: unknown,
  ): Promise<void> {
    // clear items first
    await this.removeSessionItem(itemKey);
    this.setItems.add(itemKey);

    if (typeof itemValue === "string") {
      splitString(itemValue, storageSettings.maxLength).forEach(
        (splitValue, index) => {
          localStorage.setItem(
            `${storageSettings.keyPrefix}${itemKey}${index}`,
            splitValue,
          );
        },
      );
      return;
    }
    localStorage.setItem(
      `${storageSettings.keyPrefix}${itemKey}0`,
      itemValue as string,
    );
  }

  /**
   * Gets the item for the provided key from the localStorage cache.
   * @param {string} itemKey
   * @returns {unknown | null}
   */
  async getSessionItem(itemKey: V | StorageKeys): Promise<unknown | null> {
    if (
      localStorage.getItem(`${storageSettings.keyPrefix}${itemKey}0`) === null
    ) {
      return null;
    }

    let itemValue = "";
    let index = 0;
    let key = `${storageSettings.keyPrefix}${String(itemKey)}${index}`;
    while (localStorage.getItem(key) !== null) {
      itemValue += localStorage.getItem(key);
      index++;
      key = `${storageSettings.keyPrefix}${String(itemKey)}${index}`;
    }

    return itemValue;
  }

  /**
   * Removes the item for the provided key from the localStorage cache.
   * @param {V} itemKey
   * @returns {void}
   */
  async removeSessionItem(itemKey: V | StorageKeys): Promise<void> {
    // Remove all items with the key prefix
    let index = 0;
    while (
      localStorage.getItem(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      ) !== null
    ) {
      localStorage.removeItem(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      );

      index++;
    }
    this.setItems.delete(itemKey);
  }
}
