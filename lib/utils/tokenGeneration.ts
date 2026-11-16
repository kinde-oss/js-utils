import { storageSettings } from "../sessionManager";

let writeQueue: Promise<void> = Promise.resolve();
let syncTokenSessionDepth = 0;

type TokenSessionStorage = {
  run<R>(store: true, callback: () => R): R;
  getStore(): true | undefined;
};

/**
 * AsyncLocalStorage follows the handler across `await`. A module-level held
 * flag cannot: another refresh in this realm is also running while the first
 * waits, and must still queue. Browsers have no equivalent, so same-turn
 * reentry is tracked separately.
 */
const loadTokenSessionStorage = (): TokenSessionStorage | undefined => {
  try {
    const proc = (
      globalThis as {
        process?: {
          getBuiltinModule?: (specifier: string) => {
            AsyncLocalStorage?: new () => TokenSessionStorage;
          };
        };
      }
    ).process;
    const Storage =
      proc?.getBuiltinModule?.("node:async_hooks")?.AsyncLocalStorage;
    return Storage ? new Storage() : undefined;
  } catch {
    return undefined;
  }
};

const tokenSessionStorage = loadTokenSessionStorage();

const tokenSessionActive = (): boolean =>
  syncTokenSessionDepth > 0 || tokenSessionStorage?.getStore() === true;

const nestedTokenSessionLockError = () =>
  new Error(
    "Nested token session lock rejected. The token session lock is already held and is not reentrant. onRefreshHandler must not call refreshToken, exchangeAuthCode, or any other locked token operation.",
  );

const withTokenWriteLock = <T>(task: () => Promise<T>): Promise<T> => {
  const run = writeQueue.then(task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

const runInTokenSession = <T>(task: () => T): T => {
  if (tokenSessionStorage) {
    return tokenSessionStorage.run(true, task);
  }
  return task();
};

/**
 * Runs a callback on the current token-session turn.
 * Browsers without async context reject lock requests made before this
 * callback awaits. AsyncLocalStorage also rejects requests made after it awaits.
 */
export const callWithTokenSession = <T>(fn: () => T): T => {
  if (tokenSessionStorage) {
    return tokenSessionStorage.run(true, fn);
  }
  syncTokenSessionDepth += 1;
  try {
    return fn();
  } finally {
    syncTokenSessionDepth -= 1;
  }
};

/**
 * Coordinates a complete token operation, including reading its credentials.
 * Web Locks cover cooperating browser contexts using the same storage prefix.
 * The fallback coordinates only callers in this module instance.
 * The lock is not reentrant: a nested call from the operation already holding
 * it is rejected instead of waiting on that lock.
 */
export const withTokenSessionLock = <T>(task: () => Promise<T>): Promise<T> => {
  if (tokenSessionActive()) {
    return Promise.reject(nestedTokenSessionLockError());
  }

  const run = () => runInTokenSession(task);

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.locks?.request === "function"
  ) {
    return navigator.locks.request(
      `kinde:token-session:${storageSettings.keyPrefix}`,
      () => run(),
    );
  }

  return withTokenWriteLock(run);
};
