import { KindePermissions, CustomCondition } from "../../../types";
import { getPermission, PermissionAccess } from "../getPermission";

type HasPermissionOptions =
  | KindePermissions
  | CustomCondition<"permission", KindePermissions, PermissionAccess>;

const isCustomPermissionsCondition = (permission: HasPermissionOptions) => {
  return (
    typeof permission === "object" &&
    permission !== null &&
    "permission" in permission &&
    "condition" in permission
  );
};

export type HasPermissionsParams = {
  permissions: HasPermissionOptions[];
};

export const hasPermissions = async (
  params: HasPermissionsParams,
): Promise<boolean> => {
  if (!params || !params.permissions || params?.permissions?.length === 0) {
    // no permissions provided, so assuming true
    return true;
  }

  const { permissions } = params;

  const permissionChecks = await Promise.all(
    permissions.map(async (permission) => {
      if (isCustomPermissionsCondition(permission)) {
        const permissionAccess = await getPermission(permission.permission);
        const result = await permission.condition(permissionAccess);
        return result;
      } else {
        const permissionResult = await getPermission(permission);
        return permissionResult.isGranted;
      }
    }),
  );

  return permissionChecks.every((result) => result === true);
};
