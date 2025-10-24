import { splitString } from "../../utils/splitString.js";
import { storageSettings } from "../index.js";
import { SessionBase, StorageKeys, type SessionManager } from "../types.js";

function getStorageValue(key: string): unknown | undefined {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      if (chrome.runtime.lastError) {
        reject(undefined);
      } else {
        resolve(result[key]);
      }
    });
  });
}

/**
 * Provides a chrome.store.local based session manager implementation for the browser.
 * @class ChromeStore
 */
export class ChromeStore<V extends string = StorageKeys>
  extends SessionBase<V>
  implements SessionManager<V>
{
  asyncStore = true;
  /**
   * Clears all items from session store.
   * @returns {void}
   */
  async destroySession(): Promise<void> {
    await chrome.storage.local.clear();

    this.notifyListeners();
  }

  /**
   * Sets the provided key-value store to the chrome.store.local.
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
      const chunks = splitString(itemValue, storageSettings.maxLength);
      await Promise.all(
        chunks.map((splitValue, index) =>
          chrome.storage.local.set({
            [`${storageSettings.keyPrefix}${itemKey}${index}`]: splitValue,
          }),
        ),
      );
      this.notifyListeners();
      return;
    }
    await chrome.storage.local.set({
      [`${storageSettings.keyPrefix}${itemKey}0`]: itemValue,
    });

    this.notifyListeners();
  }

  /**
   * Gets the item for the provided key from the chrome.store.local cache.
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
   * Removes the item for the provided key from the chrome.store.local cache.
   * @param {string} itemKey
   * @returns {void}
   */
  async removeSessionItem(itemKey: V | StorageKeys): Promise<void> {
    // remove items from the chrome.storage
    let index = 0;
    while (
      (await getStorageValue(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      )) !== undefined
    ) {
      await chrome.storage.local.remove(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      );
      index++;
    }

    this.notifyListeners();
  }
}
