import { hasPermissions, HasPermissionsParams } from "./hasPermissions";
import { hasRoles, HasRolesParams } from "./hasRoles";
import { hasFeatureFlags, HasFeatureFlagsParams } from "./hasFeatureFlags";

type HasParams = {
  roles: HasRolesParams["roles"];
  permissions: HasPermissionsParams["permissions"];
  featureFlags: HasFeatureFlagsParams["featureFlags"];
};

export const has = async (params: Partial<HasParams>): Promise<boolean> => {
  const checks: Promise<boolean>[] = [];

  if (params.roles) {
    checks.push(hasRoles({ roles: params.roles }));
  }
  if (params.permissions) {
    checks.push(hasPermissions({ permissions: params.permissions }));
  }
  if (params.featureFlags) {
    checks.push(hasFeatureFlags({ featureFlags: params.featureFlags }));
  }

  const results = await Promise.all(checks);
  return results.every(Boolean);
};
