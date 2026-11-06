let generation = 0;
let writeQueue: Promise<void> = Promise.resolve();

/** Current token generation. A refresh records it before reading the stored refresh token. */
export const getTokenGeneration = (): number => generation;

/** Marks tokens from an authorization-code callback as newer than any refresh in flight. */
export const advanceTokenGeneration = (): void => {
  generation += 1;
};

/**
 * Runs token persistence one writer at a time, in call order.
 * A refresh checks `getTokenGeneration` inside the lock and a callback calls
 * `advanceTokenGeneration` inside it, so a stale refresh can never write after
 * the callback's tokens. The lock covers this JavaScript context only.
 */
export const withTokenWriteLock = <T>(task: () => Promise<T>): Promise<T> => {
  const run = writeQueue.then(task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};
