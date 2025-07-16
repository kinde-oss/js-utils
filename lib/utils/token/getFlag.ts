import { getDecodedToken } from ".";
import {
  type AccountFeatureFlagsResult,
  type GetFeatureFlagsOptions,
} from "../../types";
import { callAccountApiPaginated } from "./accountApi/callAccountApi";

/**
 *
 * @param keyName key to get from the token
 * @returns { Promise<string | number | string[] | null> }
 */
export const getFlag = async <T = string | boolean | number | object>(
  name: string,
  options?: GetFeatureFlagsOptions,
): Promise<T | null> => {
  if (options?.forceApi) {
    const data = await callAccountApiPaginated<AccountFeatureFlagsResult>({
      url: `account_api/v1/feature_flags`,
    });

    return data.feature_flags.find((flag) => flag.name === name)?.value as T;
  }

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
