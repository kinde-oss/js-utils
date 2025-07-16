import {
  BaseAccountResponse,
  ApiGetEntitlementResponse,
  getEntitlementResponse,
} from "../../types";
import { callAccountApi } from "./accountApi/callAccountApi";

type EntitlementResponse = BaseAccountResponse & {
  data: ApiGetEntitlementResponse;
};

/**
 * Fetches a single entitlement from the account API.
 * @param key - The entitlement key to fetch
 * @returns {Promise<{ name: keyof T; value: V } | EntitlementResponse>}
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
