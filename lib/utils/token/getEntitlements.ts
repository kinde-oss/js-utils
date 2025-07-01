import { callAccountApi } from "./accountApi/callAccountApi";

/**
 * Fetches entitlements from the account API.
 * @returns {Promise<{ name: keyof T; value: V } | EntitlementsResponse>}
 * @template T - Type of the decoded JWT.
 * @template V - Type of the entitlement value.
 */
export const getEntitlements = async (): Promise<EntitlementsResponse> => {
  return callAccountApi<EntitlementsResponse>("account_api/v1/entitlements");
};

type Entitlement = {
  id: string;
  fixed_charge: number;
  price_name: string;
  unit_amount: number;
  feature_code: string;
  feature_name: string;
  entitlement_limit_max: number;
  entitlement_limit_min: number;
};

type Plan = {
  key: string;
  subscribed_on: string; // ISO date string
};

type Data = {
  org_code: string;
  plans: Plan[];
  entitlements: Entitlement[];
};

type Metadata = {
  has_more: boolean;
  next_page_starting_after: string;
};

type EntitlementsResponse = {
  data: Data;
  metadata: Metadata;
};
