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

/** Bounds a locked token request so a stalled fetch or body read releases the lock. */
export const TOKEN_REQUEST_TIMEOUT_MS = 30_000;

const tokenRequestTimeout = () =>
  new DOMException("Token request timed out", "TimeoutError");

export const isTokenRequestTimeout = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "TimeoutError";

/**
 * One deadline for a token request and its body.
 * Settle it before storing tokens: a later abort must not persist a session.
 */
export const createTokenRequestDeadline = (
  timeoutMs = TOKEN_REQUEST_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const startedAt = Date.now();
  let settled = false;
  const timeoutId = setTimeout(() => {
    if (!settled) {
      controller.abort(tokenRequestTimeout());
    }
  }, timeoutMs);

  const pastDeadline = () =>
    controller.signal.aborted || Date.now() - startedAt >= timeoutMs;

  const deadlineError = () => controller.signal.reason ?? tokenRequestTimeout();

  const abortIfOpen = () => {
    if (!controller.signal.aborted) {
      controller.abort(tokenRequestTimeout());
    }
  };

  return {
    signal: controller.signal,
    settle() {
      settled = true;
      clearTimeout(timeoutId);
    },
    assertWithinDeadline() {
      if (!pastDeadline()) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      abortIfOpen();
      throw deadlineError();
    },
    readBody<T>(read: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        if (pastDeadline()) {
          abortIfOpen();
          reject(deadlineError());
          return;
        }
        const onAbort = () => {
          reject(deadlineError());
        };
        controller.signal.addEventListener("abort", onAbort, { once: true });
        let work: Promise<T>;
        try {
          work = read();
        } catch (error) {
          controller.signal.removeEventListener("abort", onAbort);
          reject(error);
          return;
        }
        work.then(
          (value) => {
            controller.signal.removeEventListener("abort", onAbort);
            if (pastDeadline()) {
              abortIfOpen();
              reject(deadlineError());
              return;
            }
            resolve(value);
          },
          (error: unknown) => {
            controller.signal.removeEventListener("abort", onAbort);
            reject(error);
          },
        );
      });
    },
  };
};

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
