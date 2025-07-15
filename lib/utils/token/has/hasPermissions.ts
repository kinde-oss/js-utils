import { KindePermissions } from "../../../types";
import { getPermission } from "../getPermission";

type HasPermissionsParams = {
  permissions?: KindePermissions[];
};

export const hasPermissions = async (
  params: HasPermissionsParams,
): Promise<boolean> => {
  const { permissions } = params;

  if (!permissions || permissions.length === 0) {
    return true;
  }

  const permissionChecks = await Promise.all(
    permissions.map((permission) => getPermission(permission)),
  );

  return permissionChecks.every((result) => result.isGranted);
};
