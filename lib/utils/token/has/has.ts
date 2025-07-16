import { hasPermissions, type HasPermissionsParams } from "./hasPermissions";
import { hasRoles, type HasRolesParams } from "./hasRoles";
import { hasFeatureFlags, type HasFeatureFlagsParams } from "./hasFeatureFlags";
import { hasBillingEntitlements, type HasBillingEntitlementsParams } from "./hasBillingEntitlements";

type HasForceApi = {
  roles?: boolean;
  permissions?: boolean;
  featureFlags?: boolean;
  /**
   * Billing entitlements always use the API as they're unavailble in the token.
   */
  billingEntitlements?: true
}

type HasForceApiParams = boolean | HasForceApi;

type HasParams = {
  roles: HasRolesParams["roles"];
  permissions: HasPermissionsParams["permissions"];
  featureFlags: HasFeatureFlagsParams["featureFlags"];
  billingEntitlements: HasBillingEntitlementsParams["billingEntitlements"];
  forceApi?: HasForceApiParams;
};

const isForceApiParams = (forceApi: HasForceApiParams | undefined): forceApi is HasForceApi => {
  return forceApi !== undefined && typeof forceApi === "object"
};

export const has = async (params: Partial<HasParams>): Promise<boolean> => {
  const checks: Promise<boolean>[] = [];

  if (params.roles) {
    checks.push(hasRoles({ roles: params.roles }));
  }
  if (params.permissions) {
    checks.push(hasPermissions({ permissions: params.permissions, forceApi: isForceApiParams(params.forceApi) ? params.forceApi.permissions : params.forceApi }));
  }
  if (params.featureFlags) {
    checks.push(hasFeatureFlags({ featureFlags: params.featureFlags }));
  }
  if (params.billingEntitlements) {
    checks.push(hasBillingEntitlements({ billingEntitlements: params.billingEntitlements }));
  }

  const results = await Promise.all(checks);
  return results.every(Boolean);
};
