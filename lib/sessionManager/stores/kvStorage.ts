import { storageSettings } from "../index.js";
import { SessionBase, StorageKeys, type SessionManager } from "../types.js";
import { splitString } from "../../utils/splitString.js";

interface CloudflareKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>;
}

interface KvStorageOptions {
  defaultTtl?: number;
  enableConsistencyChecks?: boolean;
  consistencyRetries?: number;
  consistencyDelayMs?: number;
}

/**
 * Provides a Cloudflare KV based session manager implementation for server-side environments.
 * Includes built-in eventual consistency handling for reliable operations.
 * @class KvStorage
 */
export class KvStorage<V extends string = StorageKeys>
  extends SessionBase<V>
  implements SessionManager<V>
{
  private kvNamespace: CloudflareKV;
  private defaultTtl: number;
  private enableConsistencyChecks: boolean;
  private consistencyRetries: number;
  private consistencyDelayMs: number;

  constructor(kvNamespace: CloudflareKV, options: KvStorageOptions = {}) {
    super();
    this.kvNamespace = kvNamespace;
    this.defaultTtl = options.defaultTtl || 3600;
    this.enableConsistencyChecks = options.enableConsistencyChecks ?? true;
    this.consistencyRetries = options.consistencyRetries ?? 3;
    this.consistencyDelayMs = options.consistencyDelayMs ?? 250;
    
    if (storageSettings.useInsecureForRefreshToken) {
      console.warn("KvStorage: useInsecureForRefreshToken is enabled - consider security implications for refresh tokens in KV storage");
    }
  }

  /**
   * Clears all items from session store.
   * @returns {void}
   */
  async destroySession(): Promise<void> {
    try {
      const { keys } = await this.kvNamespace.list({ 
        prefix: storageSettings.keyPrefix 
      });
      
      await Promise.all(
        keys.map(key => this.kvNamespace.delete(key.name))
      );
    } catch (error) {
      console.error('KvStorage: Failed to destroy session:', error);
      throw error;
    }
  }

  /**
   * Sets the provided key-value store to the KV storage with optional consistency verification.
   */
  async setSessionItem(
    itemKey: V | StorageKeys,
    itemValue: unknown,
  ): Promise<void> {
    try {
      await this.removeSessionItem(itemKey);

      if (typeof itemValue === "string") {    
        const chunks = splitString(itemValue, storageSettings.maxLength);
        
        await Promise.all(
          chunks.map((splitValue, index) =>
            this.kvNamespace.put(
              `${storageSettings.keyPrefix}${itemKey}${index}`,
              splitValue,
              { expirationTtl: this.defaultTtl }
            )
          )
        );
      } else {
        const value = typeof itemValue === 'object' 
          ? JSON.stringify(itemValue) 
          : String(itemValue);
          
        await this.kvNamespace.put(
          `${storageSettings.keyPrefix}${String(itemKey)}0`,
          value,
          { expirationTtl: this.defaultTtl }
        );
      }

      if (this.enableConsistencyChecks) {
        await this.waitForConsistency(itemKey, itemValue);
      }
    } catch (error) {
      console.error(`KvStorage: Failed to set session item ${String(itemKey)}:`, error);
      throw error;
    }
  }

  /**
   * Gets the item for the provided key from the KV storage with retry logic for eventual consistency
   */
  async getSessionItem(itemKey: V | StorageKeys): Promise<unknown | null> {
    if (!this.enableConsistencyChecks) {
      return this._getSessionItemOnce(itemKey);
    }

    for (let attempt = 0; attempt < this.consistencyRetries; attempt++) {
      const result = await this._getSessionItemOnce(itemKey);
      
      if (result !== null || attempt === this.consistencyRetries - 1) {
        return result;
      }
      
      await this.delay(this.consistencyDelayMs * (attempt + 1));
    }
    
    return null;
  }

  /**
   * Internal method to get session item without retries
   */
  private async _getSessionItemOnce(itemKey: V | StorageKeys): Promise<unknown | null> {
    try {
      const firstChunk = await this.kvNamespace.get(
        `${storageSettings.keyPrefix}${String(itemKey)}0`
      );
      
      if (firstChunk === null) {
        return null;
      }

      let itemValue = "";
      let index = 0;
      let currentChunk: string | null = firstChunk;
      
      while (currentChunk !== null) {
        itemValue += currentChunk;
        index++;
        
        currentChunk = await this.kvNamespace.get(
          `${storageSettings.keyPrefix}${String(itemKey)}${index}`
        );
      }

      return itemValue;
    } catch (error) {
      console.error(`KvStorage: Failed to get session item ${String(itemKey)}:`, error);
      return null;
    }
  }

  /**
   * Waits for write consistency by verifying the written value can be read back
   */
  private async waitForConsistency(
    itemKey: V | StorageKeys, 
    expectedValue: unknown
  ): Promise<void> {
    const expectedString = typeof expectedValue === 'string' 
      ? expectedValue 
      : typeof expectedValue === 'object'
        ? JSON.stringify(expectedValue)
        : String(expectedValue);

    for (let attempt = 0; attempt < this.consistencyRetries; attempt++) {
      const readValue = await this._getSessionItemOnce(itemKey);
      
      if (readValue === expectedString) {
        return;
      }
      
      if (attempt < this.consistencyRetries - 1) {
        await this.delay(this.consistencyDelayMs);
      }
    }
    
    console.warn(`KvStorage: Consistency check failed for ${String(itemKey)} after ${this.consistencyRetries} attempts`);
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sets multiple items with consistency verification
   */
  async setItems(items: Record<string, unknown>): Promise<void> {
    if (this.enableConsistencyChecks) {
      for (const [key, value] of Object.entries(items)) {
        await this.setSessionItem(key as V, value);
      }
    } else {
      await Promise.all(
        Object.entries(items).map(([key, value]) =>
          this.setSessionItem(key as V, value)
        )
      );
    }
  }

  /**
   * Removes the item for the provided key from the KV storage.
   * @param {string} itemKey
   * @returns {void}
   */
  async removeSessionItem(itemKey: V | StorageKeys): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      let index = 0;
      
      while (true) {
        const key = `${storageSettings.keyPrefix}${String(itemKey)}${index}`;
        const value = await this.kvNamespace.get(key);
        
        if (value === null) {
          break; 
        }
        
        keysToDelete.push(key);
        index++;
      }
      
      await Promise.all(
        keysToDelete.map(key => this.kvNamespace.delete(key))
      );
    } catch (error) {
      console.error(`KvStorage: Failed to remove session item ${String(itemKey)}:`, error);
      throw error;
    }
  }

  /**
   * Updates the TTL for stored items (KV-specific method)
   * @param ttl - Time to live in seconds
   */
  setDefaultTtl(ttl: number): void {
    this.defaultTtl = ttl;
  }

  /**
   * Gets the current default TTL
   */
  getDefaultTtl(): number {
    return this.defaultTtl;
  }

  /**
   * Configure consistency behavior
   */
  setConsistencyOptions(options: {
    enabled?: boolean;
    retries?: number;
    delayMs?: number;
  }): void {
    if (options.enabled !== undefined) {
      this.enableConsistencyChecks = options.enabled;
    }
    if (options.retries !== undefined) {
      this.consistencyRetries = options.retries;
    }
    if (options.delayMs !== undefined) {
      this.consistencyDelayMs = options.delayMs;
    }
  }

  /**
   * Get current consistency settings
   */
  getConsistencyOptions(): {
    enabled: boolean;
    retries: number;
    delayMs: number;
  } {
    return {
      enabled: this.enableConsistencyChecks,
      retries: this.consistencyRetries,
      delayMs: this.consistencyDelayMs,
    };
  }
}