import { getDecodedToken } from ".";
import { getDecodedTokenSync, JWTDecoded } from "./getDecodedToken";
import { BaseAccountResponse, GetPermissionsOptions } from "../../types";
import { callAccountApiPaginated } from "./accountApi/callAccountApi";

type AccountPermissionsResult = BaseAccountResponse & {
  data: {
    org_code: string;
    permissions: { id: string; name: string; key: string }[];
  };
};

export type Permissions<T = string> = {
  orgCode: string | null;
  permissions: T[];
};

const _getPermissionsCore = <T = string>(
  token: JWTDecoded | null,
): Permissions<T> => {
  if (!token) {
    return {
      orgCode: null,
      permissions: [],
    };
  }
  const permissions = token.permissions || token["x-hasura-permissions"] || [];
  const orgCode = token.org_code || token["x-hasura-org-code"];

  return {
    orgCode,
    permissions: permissions as T[],
  };
};
/**
 * Get all permissions
 * @returns { Promise<Permissions> }
 */
export const getPermissions = async <T = string>(
  options?: GetPermissionsOptions,
): Promise<Permissions<T>> => {
  if (options?.forceApi) {
    const data = await callAccountApiPaginated<AccountPermissionsResult>({
      url: `account_api/v1/permissions`,
    });

    return {
      orgCode: data.org_code,
      permissions:
        (data.permissions?.map((permission) => permission.key) as T[]) || [],
    };
  }

  const token = await getDecodedToken();
  return _getPermissionsCore<T>(token);
};

export const getPermissionsSync = <T = string>(
  options?: GetPermissionsOptions,
): Permissions<T> => {
  if (options?.forceApi) {
    throw new Error("forceApi cannot be used in sync mode");
  }

  const token = getDecodedTokenSync();
  return _getPermissionsCore<T>(token);
};
