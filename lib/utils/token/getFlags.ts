import { getDecodedToken } from ".";
import {
  type GetFeatureFlagsOptions,
  type AccountFeatureFlagsResult,
} from "../../types";
import { callAccountApiPaginated } from "./accountApi/callAccountApi";

type TokenFeatureFlag = {
  key: string;
  value: string | boolean | number | object;
  type: "string" | "boolean" | "integer" | "object";
};

export const getFlags = async (
  options?: GetFeatureFlagsOptions,
): Promise<TokenFeatureFlag[] | null> => {
  if (options?.forceApi) {
    const data = await callAccountApiPaginated<AccountFeatureFlagsResult>({
      url: `account_api/v1/feature_flags`,
    });

    return (
      data.feature_flags?.map((flag) => ({
        key: flag.key,
        value: flag.value,
        type: flag.type as "string" | "boolean" | "integer" | "object",
      })) || []
    );
  }

  const claims = await getDecodedToken();

  if (!claims) {
    return null;
  }

  const flags = claims.feature_flags || claims["x-hasura-feature-flags"];

  if (!flags) {
    return null;
  }

  return Object.entries(flags).map(([key, value]) => ({
    key,
    value: value.v,
    type: value.t as "string" | "boolean" | "integer" | "object",
  }));
};
