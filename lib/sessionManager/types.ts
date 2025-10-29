import { RefreshTokenResult, RefreshType } from "../types";

/**
 * This interfaces provides the contract that an session management utility must
 * satisfiy in order to work with this SDK, please vist the example provided in the
 * README, to understand how this works.
 */
type Awaitable<T> = T | Promise<T>;

type StoreListener = () => void | Promise<void>;

export enum StorageKeys {
  accessToken = "accessToken",
  idToken = "idToken",
  refreshToken = "refreshToken",
  state = "state",
  nonce = "nonce",
  codeVerifier = "codeVerifier",
}

export enum TimeoutActivityType {
  preWarning = "preWarning",
  timeout = "timeout",
}

export type TimeoutTokenData = {
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
};

export type StorageSettingsType = {
  keyPrefix: string;
  maxLength: number;
  useInsecureForRefreshToken: boolean;
  activityTimeoutMinutes?: number;
  /**
   * Pre-warning in minutes. MUST be less than activityTimeoutMinutes when set.
   */
  activityTimeoutPreWarningMinutes?: number;
  onActivityTimeout?: (
    timeoutType: TimeoutActivityType,
    tokens?: TimeoutTokenData,
  ) => void | Promise<void>;
  /**
   *
   */
  onRefreshHandler?: (refreshType: RefreshType) => Promise<RefreshTokenResult>;
};

export abstract class SessionBase<V extends string = StorageKeys>
  implements SessionManager<V>
{
  abstract asyncStore: boolean;
  private listeners: Set<StoreListener> = new Set();
  private notificationScheduled = false;

  abstract getSessionItem<T = unknown>(
    itemKey: V | StorageKeys,
  ): Awaitable<T | unknown | null>;
  abstract setSessionItem<T = unknown>(
    itemKey: V | StorageKeys,
    itemValue: T,
  ): Awaitable<void>;
  abstract removeSessionItem(itemKey: V | StorageKeys): Awaitable<void>;
  abstract destroySession(): Awaitable<void>;

  notifyListeners(): void {
    if (this.listeners.size === 0) {
      return;
    }
    void this.scheduleNotification();
  }

  private async scheduleNotification(): Promise<void> {
    if (this.notificationScheduled) {
      return;
    }

    this.notificationScheduled = true;

    await new Promise<void>((resolve) => {
      setTimeout(async () => {
        await Promise.all(
          Array.from(this.listeners).map((listener) => listener()),
        );
        this.notificationScheduled = false;
        resolve();
      }, 0);
    });
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async setItems(items: Partial<Record<V, unknown>>): Promise<void> {
    await Promise.all(
      (Object.entries(items) as [V | StorageKeys, unknown][]).map(
        ([key, value]) => {
          return this.setSessionItem(key, value);
        },
      ),
    );
  }

  async getItems(...items: V[]): Promise<Partial<Record<V, unknown>>> {
    const promises = items.map(async (item) => {
      const value = await this.getSessionItem(item);
      return [item, value] as const;
    });
    const entries = await Promise.all(promises);
    return Object.fromEntries(entries) as Partial<Record<V, unknown>>;
  }

  async removeItems(...items: V[]): Promise<void> {
    await Promise.all(
      items.map((item) => {
        return this.removeSessionItem(item);
      }),
    );
  }
}

export interface SessionManager<V extends string = StorageKeys> {
  asyncStore: boolean;
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

  /**
   * Removes multiple items simultaneously.
   * @param items
   */
  removeItems(...items: V[]): Awaitable<void>;

  /**
   * Gets multiple items simultaneously.
   * @param items
   */
  getItems(...items: V[]): Awaitable<Partial<Record<V, unknown>>>;

  /**
   * Subscribes to store changes.
   * @param listener - Function to call when store changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StoreListener): () => void;

  /**
   * Notifies listeners of store changes.
   */
  notifyListeners(): void;
}
