import { getDecodedToken } from ".";

/**
 *
 * @param keyName key to get from the token
 * @returns { Promise<string | number | string[] | null> }
 */
export const getFlag = async <T = string | boolean | number | object>(
  name: string,
): Promise<T | null> => {
  const claims = await getDecodedToken();

  if (!claims) {
    return null;
  }

  const flags = claims.feature_flags || claims["x-hasura-feature-flags"];

  if (!flags) {
    return null;
  }

  const value = flags[name];
  return (value?.v as T) ?? null;
};
