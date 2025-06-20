// @ts-expect-error express is not in dev deps but in peer deps
import type { Request } from "express";
import { SessionBase, StorageKeys, type SessionManager } from "../types.js";

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
 * @class ExpressSessionManager
 */
export class ExpressSessionManager<V extends string = StorageKeys>
  extends SessionBase<V>
  implements SessionManager<V>
{
  /**
   * The Express req obj which holds the session's data
   */
  private req: Request;

  constructor(req: Request) {
    super();
    if (!req.session) {
      throw new Error(
        "Session not available on the request. Please ensure the 'express-session' middleware is configured and running before the Kinde middleware."
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
    // ?? null ensures we consistently return null for missing keys
    const itemValue = this.req.session![itemKey as string] ?? null;
    return Promise.resolve(itemValue);
  }

  /**
   * Sets a value in the Express session.
   * @param {string} itemKey
   * @param {unknown} itemValue
   * @returns {Promise<void>}
   */
  async setSessionItem(
    itemKey: V | StorageKeys,
    itemValue: unknown
  ): Promise<void> {
    this.req.session![itemKey as string] = itemValue;
    return Promise.resolve();
  }

  /**
   * Removes a value from the Express session.
   * @param {string} itemKey
   * @returns {Promise<void>}
   */
  async removeSessionItem(itemKey: V | StorageKeys): Promise<void> {
    delete this.req.session![itemKey as string];
    return Promise.resolve();
  }

  /**
   * Clears the entire Express session.
   * @returns {Promise<void>}
   */
  async destroySession(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.req.session!.destroy((err) => {
        if (err) {
          //figure out how to handle this better
          console.error("Error destroying session:", err);
          return reject(err);
        }
        resolve();
      });
    });
  }
}
