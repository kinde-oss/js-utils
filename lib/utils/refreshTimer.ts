export let refreshTimer: number | undefined;

export function setRefreshTimer(timer: number, callback: () => void) {
  refreshTimer = window.setTimeout(callback, timer * 1000 - 10000);
}

export function clearRefreshTimer() {
  if (refreshTimer !== undefined) {
    window.clearTimeout(refreshTimer);
    refreshTimer = undefined;
  }
}
