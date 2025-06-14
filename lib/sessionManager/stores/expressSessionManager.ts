import type {Request} from 'express';
import {SessionBase, StorageKeys, type SessionManager} from '../types.js';

/**
 * Provides an Express.js session-based session manager.
 * This class acts as a structured interface to the 'req.session' object,
 * that is populated by the express-session middleware.
 * 
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
      if(!req.session){
        throw new Error("Session not available on the request. Please ensure the 'express-session' middleware is configured and running before the Kinde middleware.")
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




   
  }