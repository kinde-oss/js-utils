import { storageSettings } from "../index.js";
import { SessionBase, StorageKeys, type SessionManager } from "../types.js";
import { splitString } from "../../utils/splitString.js";

interface CloudflareKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>;
}

/**
 * Provides a Cloudflare KV based session manager implementation for server-side environments.
 * @class KvStorage
 */
export class KvStorage<V extends string = StorageKeys>
  extends SessionBase<V>
  implements SessionManager<V>
{
  private kvNamespace: CloudflareKV;
  private defaultTtl: number;

  constructor(kvNamespace: CloudflareKV, options?: { defaultTtl?: number }) {
    super();
    this.kvNamespace = kvNamespace;
    this.defaultTtl = options?.defaultTtl || 3600;
    
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
   * Sets the provided key-value store to the KV storage.
   * @param {string} itemKey
   * @param {unknown} itemValue
   * @returns {void}
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
        return;
      }
      
      await this.kvNamespace.put(
        `${storageSettings.keyPrefix}${String(itemKey)}0`,
        itemValue as string,
        { expirationTtl: this.defaultTtl }
      );
    } catch (error) {
      console.error(`KvStorage: Failed to set session item ${String(itemKey)}:`, error);
      throw error;
    }
  }

  /**
   * Gets the item for the provided key from the KV storage.
   * @param {string} itemKey
   * @returns {unknown | null}
   */
  async getSessionItem(itemKey: V | StorageKeys): Promise<unknown | null> {
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
}