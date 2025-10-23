import { getDecodedToken } from ".";
import { getDecodedTokenSync, JWTDecoded } from "./getDecodedToken";
import { GetPermissionOptions } from "../../types";
import { callAccountApi } from "./accountApi/callAccountApi";

export type PermissionAccess = {
  permissionKey: string;
  orgCode: string | null;
  isGranted: boolean;
};

const _getPermissionCore = (
  token: JWTDecoded | null,
  permissionKey: string,
): PermissionAccess => {
  if (!token) {
    return {
      permissionKey,
      orgCode: null,
      isGranted: false,
    };
  }
  const permissions = token.permissions || token["x-hasura-permissions"] || [];
  const orgCode = token.org_code || token["x-hasura-org-code"] || null;
  return {
    permissionKey,
    orgCode,
    isGranted: !!permissions.includes(permissionKey),
  };
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
  return _getPermissionCore(token, permissionKey as string);
};

export const getPermissionSync = <T = string>(
  permissionKey: T,
  options?: GetPermissionOptions,
): PermissionAccess => {
  if (options?.forceApi) {
    throw new Error("forceApi cannot be used in sync mode");
  }

  const token = getDecodedTokenSync();
  return _getPermissionCore(token, permissionKey as string);
};
