let refreshTimer: number | undefined;

export function setRefreshTimer(timer: number, callback: () => void) {
  clearRefreshTimer();
  if (typeof window === "undefined") {
    throw new Error("setRefreshTimer requires a browser environment");
  }
  if (timer <= 0) {
    throw new Error("Timer duration must be positive");
  }
  refreshTimer = window.setTimeout(callback, timer * 1000 - 10000);
}

export function clearRefreshTimer() {
  if (refreshTimer !== undefined) {
    window.clearTimeout(refreshTimer);
    refreshTimer = undefined;
  }
}
