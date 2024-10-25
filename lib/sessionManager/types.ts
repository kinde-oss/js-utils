/**
 * This interfaces provides the contract that an session management utility must
 * satisfiy in order to work with this SDK, please vist the example provided in the
 * README, to understand how this works.
 */
type Awaitable<T> = Promise<T>;

export enum StorageKeys {
  accessToken = "accessToken",
  idToken = "idToken",
  refreshToken = "refreshToken",
  state = "state",
  nonce = "nonce",
}

export type StorageSettingsType = {
  keyPrefix: string;
  maxLength: number;
};

export abstract class SessionBase<V extends string = StorageKeys>
  implements SessionManager<V>
{
  abstract getSessionItem<T = unknown>(
    itemKey: V | StorageKeys,
  ): Awaitable<T | unknown | null>;
  abstract setSessionItem<T = unknown>(
    itemKey: V | StorageKeys,
    itemValue: T,
  ): Awaitable<void>;
  abstract removeSessionItem(itemKey: V | StorageKeys): Awaitable<void>;
  abstract destroySession(): Awaitable<void>;

  async setItems(items: Partial<Record<V, unknown>>): Awaitable<void> {
    await Promise.all(
      (Object.entries(items) as [V | StorageKeys, unknown][]).map(
        ([key, value]) => {
          return this.setSessionItem(key, value);
        },
      ),
    );
  }
}

export interface SessionManager<V extends string = StorageKeys> {
  /**
   *
   * Gets the item for the provided key from the storage.
   * @param itemKey
   * @returns
   */
  getSessionItem: <T = unknown>(
    itemKey: V | StorageKeys,
  ) => Awaitable<T | unknown | null>;
  /**
   *
   * Sets the provided key-value store to the storage.
   * @param itemKey
   * @param itemValue
   */
  setSessionItem: <T = unknown>(
    itemKey: V | StorageKeys,
    itemValue: T,
  ) => Awaitable<void>;
  /**
   *
   * Removes the item for the provided key from the storage.
   * @param itemKey
   */
  removeSessionItem: (itemKey: V | StorageKeys) => Awaitable<void>;
  /**
   *
   * Destroys the session
   */
  destroySession: () => Awaitable<void>;

  /**
   * Sets multiple items simultaneously.
   * @param {Record<V | StorageKeys, unknown>} items - Object containing key-value pairs to store
   * @returns {Promise<void>}
   */
  setItems(items: Partial<Record<V, unknown>>): Awaitable<void>;
}
