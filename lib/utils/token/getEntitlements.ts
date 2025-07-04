import {
  BaseAccountResponse,
  ApiEntitlement,
  ApiPlan,
  getEntitlementsResponse,
  ApiGetEntitlementsResponse,
} from "../../types";
import { callAccountApiPaginated } from "./accountApi/callAccountApi";

/**
 * Fetches entitlements from the account API.
 * @returns {Promise<{ name: keyof T; value: V } | EntitlementsResponse>}
 * @template T - Type of the decoded JWT.
 * @template V - Type of the entitlement value.
 */
export const getEntitlements = async (): Promise<getEntitlementsResponse> => {
  const response = await callAccountApiPaginated<EntitlementsResponse>({
    url: "account_api/v1/entitlements",
  });
  return {
    orgCode: response.org_code,
    plans: response.plans.map((plan: ApiPlan) => ({
      key: plan.key,
      subscribedOn: plan.subscribed_on,
    })),
    entitlements: response.entitlements.map((entitlement: ApiEntitlement) => ({
      id: entitlement.id,
      fixedCharge: entitlement.fixed_charge,
      priceName: entitlement.price_name,
      unitAmount: entitlement.unit_amount,
      featureKey: entitlement.feature_key,
      featureName: entitlement.feature_name,
      entitlementLimitMax: entitlement.entitlement_limit_max,
      entitlementLimitMin: entitlement.entitlement_limit_min,
    })),
  };
};

type EntitlementsResponse = BaseAccountResponse & {
  data: ApiGetEntitlementsResponse;
};
