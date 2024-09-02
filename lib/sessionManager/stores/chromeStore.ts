import { storageSettings } from "../index.js";
import { StorageKeys, type SessionManager } from "../types.js";
import { splitString } from "../utils.js";

function getStorageValue(key: string) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[key]);
      }
    });
  });
}

/**
 * Provides a memory based session manager implementation for the browser.
 * @class ChromeStore
 */
export class ChromeStore<V = StorageKeys> implements SessionManager<V> {
  /**
   * Clears all items from session store.
   * @returns {void}
   */
  async destroySession(): Promise<void> {
    await chrome.storage.local.clear();
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
    if (typeof itemValue === "string") {
      splitString(itemValue, storageSettings.maxLength).forEach(
        async (_, index) => {
          await chrome.storage.local.set({
            [`${storageSettings.keyPrefix}${itemKey}${index}`]: itemValue,
          });
        },
      );
      return;
    }
    await chrome.storage.local.set({
      [`${storageSettings.keyPrefix}${itemKey}0`]: itemValue,
    });
  }

  /**
   * Gets the item for the provided key from the memory cache.
   * @param {string} itemKey
   * @returns {unknown | null}
   */
  async getSessionItem(itemKey: V | StorageKeys): Promise<unknown | null> {
    let itemValue = "";
    let index = 0;
    let key = `${storageSettings.keyPrefix}${String(itemKey)}${index}`;
    while (
      (await getStorageValue(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      )) !== undefined
    ) {
      itemValue += await getStorageValue(key);
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
    // remove items from the chrome.storage
    let index = 0;
    while (
      chrome.storage.local.get(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      ) !== undefined
    ) {
      chrome.storage.local.remove(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      );
      index++;
    }
  }
}
