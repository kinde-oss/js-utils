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

export interface SessionManager<V = StorageKeys> {
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
}
