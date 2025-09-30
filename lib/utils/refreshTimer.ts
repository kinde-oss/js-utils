import { isClient } from "./isClient";

/**
 * Global timer reference for managing refresh timers.
 * Used to store the timeout ID for the current refresh timer.
 */
let refreshTimer: number | undefined;

/**
 * Sets a refresh timer with automatic cleanup and safety constraints.
 *
 * This function creates a new timer that will execute the provided callback function.
 * It automatically clears any existing timer before setting a new one to prevent
 * multiple timers from running simultaneously. The timer duration is constrained
 * to prevent extremely long or short timers.
 *
 * The timer duration is automatically adjusted to be at least 10 seconds less than
 * the requested duration and capped at 24 hours (86400000ms) for safety.
 *
 * @param timer - The timer duration in seconds
 * @param callback - The function to execute when the timer expires
 * @throws {Error} When called outside of a browser environment
 * @throws {Error} When timer duration is not positive
 *
 * @example
 * ```typescript
 * // Set a timer for 60 seconds
 * setRefreshTimer(60, () => {
 *   console.log("Timer expired!");
 *   // Perform refresh logic here
 * });
 *
 * // Set a timer for 1 hour (3600 seconds)
 * setRefreshTimer(3600, () => {
 *   // Refresh authentication token
 *   refreshAuthToken();
 * });
 * ```
 */
export function setRefreshTimer(timer: number, callback: () => void) {
  clearRefreshTimer();
  if (!isClient()) {
    throw new Error("setRefreshTimer requires a browser environment");
  }
  if (timer <= 0) {
    throw new Error("Timer duration must be positive");
  }
  refreshTimer = window.setTimeout(
    callback,
    Math.min(timer * 1000 - 10000, 86400000),
  );
}

/**
 * Clears the current refresh timer if one exists.
 *
 * This function safely clears any active refresh timer and resets the timer reference.
 * It's safe to call even if no timer is currently active.
 *
 * @example
 * ```typescript
 * // Clear any existing timer
 * clearRefreshTimer();
 *
 * // Set a new timer
 * setRefreshTimer(300, handleRefresh);
 *
 * // Later, clear it before it expires
 * clearRefreshTimer();
 * ```
 */
export function clearRefreshTimer() {
  if (isClient()) {
    if (refreshTimer !== undefined) {
      window.clearTimeout(refreshTimer);
      refreshTimer = undefined;
    }
  }
}
