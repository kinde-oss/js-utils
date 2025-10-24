import { getDecodedToken } from ".";
import { getDecodedTokenSync } from "./getDecodedToken";
import {
  type AccountFeatureFlagsResult,
  type GetFeatureFlagsOptions,
} from "../../types";
import { callAccountApiPaginated } from "./accountApi/callAccountApi";

type FlagValue = { v: unknown; t: string };
type FlagsContainer = Record<string, FlagValue>;
type TokenWithFlags = {
  feature_flags?: FlagsContainer;
  "x-hasura-feature-flags"?: FlagsContainer;
} | null;

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

    const flag = data.feature_flags.find((flag) => flag.name === name);
    return flag ? (flag.value as T) : null;
  }

  const claims = await getDecodedToken();
  return _getFlagCore<T>(claims, name);
};

export const getFlagSync = <T = string | boolean | number | object>(
  name: string,
  options?: GetFeatureFlagsOptions,
): T | null => {
  if (options?.forceApi) {
    throw new Error("forceApi cannot be used in sync mode");
  }

  const claims = getDecodedTokenSync();
  return _getFlagCore<T>(claims, name);
};

const _getFlagCore = <T = string | boolean | number | object>(
  claims: TokenWithFlags,
  name: string,
): T | null => {
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
