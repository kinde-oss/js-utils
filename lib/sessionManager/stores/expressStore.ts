import type { Request } from "express";
import { SessionBase, StorageKeys, type SessionManager } from "../types.js";
import { storageSettings } from "../index.js";
import { splitString } from "../../utils/splitString.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: {
        [key: string]: unknown;
        destroy: (callback: (err?: Error | null) => void) => void;
      };
    }
  }
}

/**
 * Provides an Express session-based session manager.
 * This class acts as a structured interface to the 'req.session' object,
 * that is populated by the express-session middleware.
 * @class ExpressStore
 */
export class ExpressStore<V extends string = StorageKeys>
  extends SessionBase<V>
  implements SessionManager<V>
{
  /**
   * Indicates this store uses async operations
   */
  asyncStore = true;

  /**
   * The Express req obj which holds the session's data
   */
  private req: Request;

  constructor(req: Request) {
    super();
    if (!req.session) {
      throw new Error(
        "Session not available on the request. Please ensure the 'express-session' middleware is configured and running before the Kinde middleware.",
      );
    }
    this.req = req;
  }

  /**
   * Gets a value from the Express session.
   * @param {string} itemKey
   * @returns {Promise<unknown | null>}
   */
  async getSessionItem(itemKey: V | StorageKeys): Promise<unknown | null> {
    // Reassemble split string values if present
    const baseKey = `${storageSettings.keyPrefix}${String(itemKey)}`;
    if (this.req.session![`${baseKey}0`] === undefined) {
      return null;
    }

    // if under settingConfig maxLength - return as-is
    if (this.req.session![`${baseKey}1`] === undefined) {
      return this.req.session![`${baseKey}0`];
    }

    // Multiple items exist, concatenate them as strings (for split strings)
    let itemValue = "";
    let index = 0;
    let key = `${baseKey}${index}`;
    while (this.req.session![key] !== undefined) {
      itemValue += this.req.session![key] as string;
      index++;
      key = `${baseKey}${index}`;
    }
    return itemValue;
  }

  /**
   * Sets a value in the Express session.
   * @param {string} itemKey
   * @param {unknown} itemValue
   * @returns {Promise<void>}
   */
  async setSessionItem(
    itemKey: V | StorageKeys,
    itemValue: unknown,
  ): Promise<void> {
    // Remove any existing split items first
    await this.removeSessionItem(itemKey);
    const baseKey = `${storageSettings.keyPrefix}${String(itemKey)}`;
    if (typeof itemValue === "string") {
      splitString(itemValue, storageSettings.maxLength).forEach(
        (splitValue, index) => {
          this.req.session![`${baseKey}${index}`] = splitValue;
        },
      );
      return;
    }
    this.req.session![`${baseKey}0`] = itemValue;
  }

  /**
   * Removes a value from the Express session.
   * @param {string} itemKey
   * @returns {Promise<void>}
   */
  async removeSessionItem(itemKey: V | StorageKeys): Promise<void> {
    // Remove all items with the key prefix
    const baseKey = `${storageSettings.keyPrefix}${String(itemKey)}`;
    for (const key in this.req.session!) {
      if (key.startsWith(baseKey)) {
        delete this.req.session![key];
      }
    }
  }

  /**
   * Clears the entire Express session.
   * @returns {Promise<void>}
   */
  async destroySession(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.req.session!.destroy((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
}
