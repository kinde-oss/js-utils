import { storageSettings } from "../sessionManager";

let writeQueue: Promise<void> = Promise.resolve();
let syncTokenSessionDepth = 0;

type TokenSessionOwner = {
  active: boolean;
};

type TokenSessionStorage = {
  run<R>(store: TokenSessionOwner, callback: () => R): R;
  getStore(): TokenSessionOwner | undefined;
};

/**
 * AsyncLocalStorage follows the handler across `await`, and a timer created
 * inside it keeps the store. Each operation gets its own record, cleared when
 * that operation settles, so the timer is not rejected as nested afterwards.
 * Browsers have no equivalent, so same-turn reentry is tracked separately.
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
  syncTokenSessionDepth > 0 || tokenSessionStorage?.getStore()?.active === true;

/**
 * Runs `fn` in an active ownership record.
 * An operation that is already active keeps its record. A new record stays
 * active until `fn`'s promise settles, including across `await`.
 */
const enterTokenSession = <T>(fn: () => T): T => {
  const storage = tokenSessionStorage;
  if (!storage) {
    return fn();
  }
  const current = storage.getStore();
  if (current?.active) {
    return fn();
  }

  const owner: TokenSessionOwner = { active: true };
  return storage.run(owner, () => {
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => {
          owner.active = false;
        }) as T;
      }
      owner.active = false;
      return result;
    } catch (error) {
      owner.active = false;
      throw error;
    }
  });
};

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
 * One deadline for a request and its body.
 * Settle it before storing a result: a later abort must not count as success.
 */
export const createTokenRequestDeadline = (
  timeoutMs = TOKEN_REQUEST_TIMEOUT_MS,
  createTimeoutError: () => DOMException = tokenRequestTimeout,
) => {
  const controller = new AbortController();
  const startedAt = Date.now();
  let settled = false;
  const timeoutId = setTimeout(() => {
    if (!settled) {
      controller.abort(createTimeoutError());
    }
  }, timeoutMs);

  const pastDeadline = () =>
    controller.signal.aborted || Date.now() - startedAt >= timeoutMs;

  const deadlineError = () => controller.signal.reason ?? createTimeoutError();

  const abortIfOpen = () => {
    if (!controller.signal.aborted) {
      controller.abort(createTimeoutError());
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

const runInTokenSession = <T>(task: () => Promise<T>): Promise<T> =>
  enterTokenSession(task);

/**
 * Runs a callback on the current token-session turn.
 * Browsers without async context reject lock requests made before this
 * callback awaits. An active AsyncLocalStorage operation keeps its owner, so
 * a lock request after `await` is still rejected.
 */
export const callWithTokenSession = <T>(fn: () => T): T => {
  if (tokenSessionStorage) {
    return enterTokenSession(fn);
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
