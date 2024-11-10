export let refreshTimer: number | undefined;

export function setRefreshTimer(timer: number, callback: () => void) {
  window.setTimeout(callback, timer);
}

export function clearRefreshTimer() {
  if (refreshTimer !== undefined) {
    window.clearTimeout(refreshTimer);
    refreshTimer = undefined;
  }
}