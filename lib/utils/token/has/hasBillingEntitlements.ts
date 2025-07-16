import { CustomCondition, Entitlement, KindeBillingEntitlements } from "../../../types";
import { getEntitlements } from "../getEntitlements";

type HasBillingEntitlementOptions =
  | KindeBillingEntitlements
  | CustomCondition<"entitlement", KindeBillingEntitlements, Entitlement>;

const isCustomEntitlementCondition = (entitlement: HasBillingEntitlementOptions) => {
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
  if (!params || !params.billingEntitlements || params?.billingEntitlements?.length === 0) {
    // no permissions provided, so assuming true
    return true;
  }

  const { billingEntitlements } = params;

  const entitlementChecks = await Promise.all(
    billingEntitlements.map(async (entitlement) => {
      if (isCustomEntitlementCondition(entitlement)) {
        const innerEntitlements = await getEntitlements();
        const matchingEntitlement = innerEntitlements.entitlements.find(
          (innerEntitlement) => innerEntitlement.priceName === entitlement.entitlement,
        )
        if(!matchingEntitlement) {
          return false;
        }
        return await entitlement.condition(matchingEntitlement);
      } else {
        const innerEntitlements = await getEntitlements();
        const entitlementKeys = innerEntitlements.entitlements.map(
          (innerEntitlement) => innerEntitlement.priceName,
        );
        return entitlementKeys.includes(entitlement);
      }
    }),
  );

  return entitlementChecks.every((result) => result === true);
};
