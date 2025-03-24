let refreshTimer: number | undefined;

/**
 * Sets a refresh timer in a browser environment that triggers a callback after a calculated delay.
 *
 * This function clears any existing timer, ensures it is executing in a browser, and validates that the provided
 * timer is a positive number. It then schedules the callback to run after a delay determined by the expression
 * `Math.min(timer * 1000 - 10000, 86400000)`, ensuring the timeout does not exceed 24 hours.
 *
 * @param timer The duration in seconds used to calculate the delayed execution time. Must be greater than zero.
 * @param callback The function to execute when the timer elapses.
 *
 * @throws {Error} If executed in a non-browser environment.
 * @throws {Error} If the timer is not a positive number.
 */
export function setRefreshTimer(timer: number, callback: () => void) {
  clearRefreshTimer();
  if (typeof window === "undefined") {
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
 * Clears the active refresh timer.
 *
 * If a timer is currently set, it cancels the timeout using `window.clearTimeout` and resets the timer variable.
 *
 * @remarks
 * This function is intended for use in a browser environment where the global timer variable `refreshTimer` manages a scheduled callback.
 */
export function clearRefreshTimer() {
  if (refreshTimer !== undefined) {
    window.clearTimeout(refreshTimer);
    refreshTimer = undefined;
  }
}
