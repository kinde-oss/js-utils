import { isClient } from "./isClient";

/**
 * Checks if the code is running in a server environment.
 * 
 * This function determines whether the code is executing in a server-side
 * environment by checking if the 'window' object is undefined. It returns
 * the opposite of isClient(), meaning it returns true for server environments
 * and false for client/browser environments.
 * 
 * @returns True if running on server, false if running in browser/client
 * 
 * @example
 * ```typescript
 * // On Node.js server
 * isServer() 
 * // Returns: true
 * 
 * // In browser
 * isServer()
 * // Returns: false
 * ```
 */
export const isServer = () => !isClient();