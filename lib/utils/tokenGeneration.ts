let generation = 0;

/** Current token generation. A refresh records it before it calls the token endpoint. */
export const getTokenGeneration = (): number => generation;

/** Marks tokens from an authorization-code callback as newer than any refresh in flight. */
export const advanceTokenGeneration = (): void => {
  generation += 1;
};
