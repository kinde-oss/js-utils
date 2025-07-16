import { KindeFeatureFlags } from "../../../types";
import { getFlag } from "../getFlag";

type FeatureFlagKVCondition = {
  flag: KindeFeatureFlags;
  value: boolean | string | number;
};

type HasFeatureFlagOptions = KindeFeatureFlags | FeatureFlagKVCondition;

export type HasFeatureFlagsParams = {
  featureFlags: HasFeatureFlagOptions[];
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

  const featureFlagChecks = await Promise.all(
    featureFlags.map(async (featureFlag) => {
      if (isFeatureFlagKVCondition(featureFlag)) {
        const flagValue = await getFlag(featureFlag.flag);
        return flagValue !== null && flagValue === featureFlag.value;
      } else {
        const flagValue = await getFlag(featureFlag);
        return flagValue !== null;
      }
    }),
  );

  return featureFlagChecks.every((result) => result === true);
};
