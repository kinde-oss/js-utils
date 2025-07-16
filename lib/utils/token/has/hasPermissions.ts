import { KindePermissions, CustomCondition } from "../../../types";
import { PermissionAccess } from "../getPermission";
import { getPermissions } from "../getPermissions";

type HasPermissionOptions =
  | KindePermissions
  | CustomCondition<
      "permission",
      KindePermissions,
      Omit<PermissionAccess, "isGranted">
    >;

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
  forceApi?: boolean;
};

export const hasPermissions = async (
  params: HasPermissionsParams,
): Promise<boolean> => {
  if (!params || !params.permissions || params?.permissions?.length === 0) {
    // no permissions provided, so assuming true
    return true;
  }

  const { permissions } = params;
  const accountPermissions = await getPermissions({
    forceApi: params.forceApi,
  });

  const permissionChecks = await Promise.all(
    permissions.map(async (permission) => {
      if (isCustomPermissionsCondition(permission)) {
        const matchingPermission = accountPermissions.permissions.find(
          (innerPermission) => innerPermission === permission.permission,
        );
        if (!matchingPermission) {
          return false;
        }
        return await permission.condition({
          permissionKey: permission.permission,
          orgCode: accountPermissions.orgCode,
        });
      } else {
        const matchingPermission = accountPermissions.permissions.find(
          (innerPermission) => innerPermission === permission,
        );
        if (!matchingPermission) {
          return false;
        }
        return true;
      }
    }),
  );

  return permissionChecks.every((result) => result === true);
};
