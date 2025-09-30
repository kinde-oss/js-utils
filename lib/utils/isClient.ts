/**
 * Checks if the code is running in a client/browser environment.
 *
 * This function determines whether the code is executing in a client-side
 * environment by checking if the 'window' object is defined. It returns
 * true for client/browser environments and false for server environments.
 *
 * @returns True if running in browser/client, false if running on server
 *
 * @example
 * ```typescript
 * // In browser
 * isClient()
 * // Returns: true
 *
 * // On Node.js server
 * isClient()
 * // Returns: false
 * ```
 */
export const isClient = () => {
  return typeof window !== "undefined";
};
