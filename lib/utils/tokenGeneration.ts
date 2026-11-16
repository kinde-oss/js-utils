import { storageSettings } from "../sessionManager";
let writeQueue: Promise<void> = Promise.resolve();

const withTokenWriteLock = <T>(task: () => Promise<T>): Promise<T> => {
  const run = writeQueue.then(task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

/**
 * Coordinates a complete token operation, including reading its credentials.
 * Web Locks cover cooperating browser contexts using the same storage prefix.
 * The fallback coordinates only callers in this module instance.
 */
export const withTokenSessionLock = <T>(task: () => Promise<T>): Promise<T> => {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.locks?.request === "function"
  ) {
    return navigator.locks.request(
      `kinde:token-session:${storageSettings.keyPrefix}`,
      () => task(),
    );
  }

  return withTokenWriteLock(task);
};
