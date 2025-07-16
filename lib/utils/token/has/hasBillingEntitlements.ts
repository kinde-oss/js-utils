import {
  CustomCondition,
  Entitlement,
  KindeBillingEntitlements,
} from "../../../types";
import { getEntitlements } from "../getEntitlements";

type HasBillingEntitlementOptions =
  | KindeBillingEntitlements
  | CustomCondition<"entitlement", KindeBillingEntitlements, Entitlement>;

const isCustomEntitlementCondition = (
  entitlement: HasBillingEntitlementOptions,
) => {
  return (
    typeof entitlement === "object" &&
    entitlement !== null &&
    "entitlement" in entitlement &&
    "condition" in entitlement
  );
};

export type HasBillingEntitlementsParams = {
  billingEntitlements: HasBillingEntitlementOptions[];
};

export const hasBillingEntitlements = async (
  params: HasBillingEntitlementsParams,
): Promise<boolean> => {
  if (
    !params ||
    !params.billingEntitlements ||
    params?.billingEntitlements?.length === 0
  ) {
    // no entitlements provided, so assuming true
    return true;
  }

  const { billingEntitlements } = params;
  const accountEntitlements = await getEntitlements();

  const entitlementChecks = await Promise.all(
    billingEntitlements.map(async (entitlement) => {
      if (isCustomEntitlementCondition(entitlement)) {
        const matchingEntitlement = accountEntitlements.entitlements.find(
          (innerEntitlement) =>
            innerEntitlement.priceName === entitlement.entitlement,
        );
        if (!matchingEntitlement) {
          return false;
        }
        return await entitlement.condition(matchingEntitlement);
      } else {
        const entitlementKeys = accountEntitlements.entitlements.map(
          (innerEntitlement) => innerEntitlement.priceName,
        );
        return entitlementKeys.includes(entitlement);
      }
    }),
  );

  return entitlementChecks.every((result) => result === true);
};
