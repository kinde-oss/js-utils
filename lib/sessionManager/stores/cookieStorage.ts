import { storageSettings } from "../index.js";
import { SessionBase, StorageKeys, type SessionManager } from "../types.js";
import { splitString } from "../../utils/splitString.js";

/**
 * Cookie adapter interface for framework-agnostic cookie operations
 */
export interface CookieAdapter {
  set(name: string, value: string, options?: CookieOptions): void;
  get(name: string): string | undefined | null;
  delete(name: string, options?: CookieOptions): void;
}

/**
 * Cookie options interface matching common cookie attributes
 */
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
}

/**
 * Default cookie options for secure session management
 */
const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 900, 
};

/**
 * Provides a cookie-based session manager implementation for server-side environments.
 * Designed for temporary data that requires immediate consistency (OAuth state, nonce, etc.)
 * 
 * @class CookieStorage
 */
export class CookieStorage<V extends string = StorageKeys>
  extends SessionBase<V>
  implements SessionManager<V>
{
  private cookieAdapter: CookieAdapter;
  private defaultOptions: CookieOptions;
  private maxChunkSize: number;

  constructor(
    cookieAdapter: CookieAdapter,
    options?: {
      defaultOptions?: Partial<CookieOptions>;
      maxChunkSize?: number;
    }
  ) {
    super();
    this.cookieAdapter = cookieAdapter;
    
    this.defaultOptions = {
      ...DEFAULT_COOKIE_OPTIONS,
      ...(options?.defaultOptions || {})
    };
    

    this.maxChunkSize = options?.maxChunkSize || Math.min(storageSettings.maxLength, 3000);
    
    if (storageSettings.useInsecureForRefreshToken) {
      console.warn(
        "CookieStorage: useInsecureForRefreshToken is enabled - refresh tokens will be stored in cookies which may have security implications"
      );
    }
  }

  /**
   * Clears all items from cookie storage.
   * Note: This removes all cookies with the configured key prefix
   * @returns {Promise<void>}
   */
  async destroySession(): Promise<void> {
    const allKeys = Object.values(StorageKeys);
    await Promise.all(
      allKeys.map(key => this.removeSessionItem(key))
    );
  }

  /**
   * Sets the provided key-value pair to cookie storage.
   * Large values are automatically chunked across multiple cookies.
   * @param {V | StorageKeys} itemKey
   * @param {unknown} itemValue
   * @returns {Promise<void>}
   */
  async setSessionItem(
    itemKey: V | StorageKeys,
    itemValue: unknown,
  ): Promise<void> {
    try {
      await this.removeSessionItem(itemKey);

      if (typeof itemValue === "string") {
        const chunks = splitString(itemValue, this.maxChunkSize);
        
        chunks.forEach((chunk, index) => {
          const cookieName = `${storageSettings.keyPrefix}${itemKey}${index}`;
          this.cookieAdapter.set(cookieName, chunk, this.defaultOptions);
        });
        
        return;
      }
      
      const stringValue = typeof itemValue === 'object' 
        ? JSON.stringify(itemValue) 
        : String(itemValue);
        
      const cookieName = `${storageSettings.keyPrefix}${String(itemKey)}0`;
      this.cookieAdapter.set(cookieName, stringValue, this.defaultOptions);
      
    } catch (error) {
      console.error(`CookieStorage: Failed to set session item ${String(itemKey)}:`, error);
      throw error;
    }
  }

  /**
   * Gets the item for the provided key from cookie storage.
   * Automatically reconstructs chunked values.
   * @param {V | StorageKeys} itemKey
   * @returns {Promise<unknown | null>}
   */
  async getSessionItem(itemKey: V | StorageKeys): Promise<unknown | null> {
    try {
      const firstChunkName = `${storageSettings.keyPrefix}${String(itemKey)}0`;
      const firstChunk = this.cookieAdapter.get(firstChunkName);
      
      if (!firstChunk) {
        return null;
      }

      let itemValue = "";
      let index = 0;
      let currentChunk: string | undefined | null = firstChunk;
      
      while (currentChunk) {
        itemValue += currentChunk;
        index++;
        
        const nextChunkName = `${storageSettings.keyPrefix}${String(itemKey)}${index}`;
        currentChunk = this.cookieAdapter.get(nextChunkName);
      }

      return itemValue;
      
    } catch (error) {
      console.error(`CookieStorage: Failed to get session item ${String(itemKey)}:`, error);
      return null;
    }
  }

  /**
   * Removes the item for the provided key from cookie storage.
   * Removes all chunks associated with the key.
   * @param {V | StorageKeys} itemKey
   * @returns {Promise<void>}
   */
  async removeSessionItem(itemKey: V | StorageKeys): Promise<void> {
    try {
      let index = 0;
      let hasMore = true;
      
      while (hasMore) {
        const cookieName = `${storageSettings.keyPrefix}${String(itemKey)}${index}`;
        const value = this.cookieAdapter.get(cookieName);
        
        if (value) {
          this.cookieAdapter.delete(cookieName, { path: this.defaultOptions.path });
          index++;
        } else {
          hasMore = false;
        }
      }
      
    } catch (error) {
      console.error(`CookieStorage: Failed to remove session item ${String(itemKey)}:`, error);
      throw error;
    }
  }

  /**
   * Updates the default cookie options for future operations
   * @param options 
   */
  setDefaultOptions(options: Partial<CookieOptions>): void {
    this.defaultOptions = {
      ...this.defaultOptions,
      ...options
    };
  }

  /**
   * Gets the current default cookie options
   */
  getDefaultOptions(): CookieOptions {
    return { ...this.defaultOptions };
  }

  /**
   * Gets the maximum chunk size used for splitting large values
   */
  getMaxChunkSize(): number {
    return this.maxChunkSize;
  }
}

/**
 * Helper function to create a generic cookie adapter from common cookie interfaces
 */
export function createGenericCookieAdapter(
  getCookie: (name: string) => string | undefined | null,
  setCookie: (name: string, value: string, options?: CookieOptions) => void,
  deleteCookie: (name: string, options?: CookieOptions) => void
): CookieAdapter {
  return {
    get: getCookie,
    set: setCookie,
    delete: deleteCookie
  };
}