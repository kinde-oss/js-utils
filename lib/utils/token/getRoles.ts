import { getClaim, getDecodedToken } from ".";
import { getDecodedTokenSync } from "./getDecodedToken";
import { BaseAccountResponse, GetRolesOptions } from "../../types";
import { callAccountApiPaginated } from "./accountApi/callAccountApi";

export type Role = { id: string; name: string; key: string };

type AccountRolesResult = BaseAccountResponse & {
  data: {
    org_code: string;
    roles: { id: string; name: string; key: string }[];
  };
};

type TokenWithRoles = {
  roles?: Role[];
  "x-hasura-roles"?: Role[];
} | null;

const _getRolesCore = (token: TokenWithRoles): Role[] => {
  if (!token) {
    return [];
  }
  if (!token.roles && !token["x-hasura-roles"]) {
    console.warn(
      "No roles found in token, ensure roles have been included in the token customisation within the application settings",
    );
    return [];
  }
  return (token.roles || token["x-hasura-roles"]) as Role[];
};

/**
 * Get all permissions
 * @returns { Promise<Role[]> }
 */
export const getRoles = async (options?: GetRolesOptions): Promise<Role[]> => {
  const rolesClaim = await getClaim("roles");
  if (options?.forceApi || !rolesClaim?.value) {
    const data = await callAccountApiPaginated<AccountRolesResult>({
      url: `account_api/v1/roles`,
    });

    return (
      data.roles?.map((role) => ({
        id: role.id,
        name: role.name,
        key: role.key,
      })) || []
    );
  }

  const token = await getDecodedToken();
  return _getRolesCore(token);
};

export const getRolesSync = (options?: GetRolesOptions): Role[] => {
  if (options?.forceApi) {
    throw new Error("forceApi cannot be used in sync mode");
  }

  const token = getDecodedTokenSync();

  if (!token) {
    throw new Error("Authentication token not found.");
  }
  return _getRolesCore(token);
};
