import {
  BaseAccountResponse,
  ApiGetEntitlementResponse,
  getEntitlementResponse,
} from "../../types";
import { callAccountApi } from "./accountApi/callAccountApi";

/**
 * Fetches entitlements from the account API.
 * @returns {Promise<{ name: keyof T; value: V } | EntitlementsResponse>}
 * @template T - Type of the decoded JWT.
 * @template V - Type of the entitlement value.
 */
export const getEntitlement = async (
  key: string,
): Promise<getEntitlementResponse> => {
  const response = await callAccountApi<EntitlementResponse>(
    `account_api/v1/entitlement/${encodeURIComponent(key)}`,
  );
  return {
    orgCode: response.data.org_code,
    entitlement: {
      id: response.data.entitlement.id,
      fixedCharge: response.data.entitlement.fixed_charge,
      priceName: response.data.entitlement.price_name,
      unitAmount: response.data.entitlement.unit_amount,
      featureKey: response.data.entitlement.feature_key,
      featureName: response.data.entitlement.feature_name,
      entitlementLimitMax: response.data.entitlement.entitlement_limit_max,
      entitlementLimitMin: response.data.entitlement.entitlement_limit_min,
    },
  };
};

type EntitlementResponse = BaseAccountResponse & {
  data: ApiGetEntitlementResponse;
};
