import { type KindeFeatureFlags } from "../../../types";
import { getFlags } from "../getFlags";

type FeatureFlagKVCondition = {
  flag: KindeFeatureFlags;
  value: boolean | string | number;
};

type HasFeatureFlagOptions = KindeFeatureFlags | FeatureFlagKVCondition;

export type HasFeatureFlagsParams = {
  featureFlags: HasFeatureFlagOptions[];
  forceApi?: boolean;
};

const isFeatureFlagKVCondition = (flag: HasFeatureFlagOptions) => {
  return (
    typeof flag === "object" &&
    flag !== null &&
    "flag" in flag &&
    "value" in flag
  );
};

export const hasFeatureFlags = async (
  params: HasFeatureFlagsParams,
): Promise<boolean> => {
  if (!params || !params.featureFlags || params?.featureFlags?.length === 0) {
    // no feature flags provided, so assuming true
    return true;
  }

  const { featureFlags } = params;
  const accountFlags = await getFlags({ forceApi: params.forceApi });

  const featureFlagChecks = featureFlags.map((featureFlag) => {
    if (isFeatureFlagKVCondition(featureFlag)) {
      const flag = accountFlags?.find((flag) => flag.key === featureFlag.flag);
      return flag !== undefined && flag.value === featureFlag.value;
    } else {
      const flag = accountFlags?.find((flag) => flag.key === featureFlag);
      return flag !== undefined;
    }
  });

  return featureFlagChecks.every((result) => result === true);
};
