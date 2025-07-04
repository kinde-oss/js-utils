import { getDecodedToken } from ".";
import { GetPermissionOptions } from "../../types";
import { callAccountApi } from "./accountApi/callAccountApi";

export type PermissionAccess = {
  permissionKey: string;
  orgCode: string | null;
  isGranted: boolean;
};

/**
 *
 * @param permissionKey gets the value of a permission
 * @returns { PermissionAccess }
 */
export const getPermission = async <T = string>(
  permissionKey: T,
  options?: GetPermissionOptions,
): Promise<PermissionAccess> => {
  if (options?.forceApi) {
    return callAccountApi<PermissionAccess>(
      `account_api/v1/permission/${encodeURIComponent(permissionKey as string)}`,
    );
  }

  const token = await getDecodedToken();

  if (!token) {
    return {
      permissionKey: permissionKey as string,
      orgCode: null,
      isGranted: false,
    };
  }

  const permissions = token.permissions || [];
  return {
    permissionKey: permissionKey as string,
    orgCode: token.org_code,
    isGranted: !!permissions.includes(permissionKey as string),
  };
};
