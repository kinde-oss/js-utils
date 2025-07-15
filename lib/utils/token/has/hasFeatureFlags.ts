import { KindeFeatureFlags } from "../../../types";
import { getFlag } from "../getFlag";

type HasFeatureFlagsParams = {
  featureFlags?: KindeFeatureFlags[];
};

export const hasFeatureFlags = async (
  params: HasFeatureFlagsParams,
): Promise<boolean> => {
  const { featureFlags } = params;

  if (!featureFlags || featureFlags.length === 0) {
    return true;
  }

  const featureFlagChecks = await Promise.all(
    featureFlags.map((flag) => getFlag(flag)),
  );

  return featureFlagChecks.every((result) => result !== null);
};
