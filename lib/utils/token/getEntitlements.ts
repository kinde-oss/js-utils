import { callAccountApi } from "./accountApi/callAccountApi";

/**
 * Fetches entitlements from the account API.
 * @returns {Promise<{ name: keyof T; value: V } | EntitlementsResponse>}
 * @template T - Type of the decoded JWT.
 * @template V - Type of the entitlement value.
 */
export const getEntitlements = async (): Promise<getEntitlementsResponse> => {
  const response = await callAccountApi<EntitlementsResponse>(
    "account_api/v1/entitlements",
  );
  return {
    orgCode: response.data.org_code,
    plans: response.data.plans.map((plan) => ({
      key: plan.key,
      subscribedOn: plan.subscribed_on,
    })),
    entitlements: response.data.entitlements.map((entitlement) => ({
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

type getEntitlementsResponse = {
  orgCode: string;
  plans: Plan[];
  entitlements: Entitlement[];
};

type Entitlement = {
  id: string;
  fixedCharge: number;
  priceName: string;
  unitAmount: number;
  featureKey: string;
  featureName: string;
  entitlementLimitMax: number;
  entitlementLimitMin: number;
};

type ApiEntitlement = {
  id: string;
  fixed_charge: number;
  price_name: string;
  unit_amount: number;
  feature_key: string;
  feature_name: string;
  entitlement_limit_max: number;
  entitlement_limit_min: number;
};

type ApiPlan = {
  key: string;
  subscribed_on: string; // ISO date string
};

type Plan = {
  key: string;
  subscribedOn: string; // ISO date string
};

type Data = {
  org_code: string;
  plans: ApiPlan[];
  entitlements: ApiEntitlement[];
};

type Metadata = {
  has_more: boolean;
  next_page_starting_after: string;
};

type EntitlementsResponse = {
  data: Data;
  metadata: Metadata;
};
