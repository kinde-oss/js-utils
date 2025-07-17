import { getClaim, getDecodedToken } from ".";
import { BaseAccountResponse, GetRolesOptions } from "../../types";
import { callAccountApiPaginated } from "./accountApi/callAccountApi";

export type Role = { id: string; name: string; key: string };

type AccountRolesResult = BaseAccountResponse & {
  data: {
    org_code: string;
    roles: { id: string; name: string; key: string }[];
  };
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

  if (!token) {
    return [];
  }

  if (!token.roles && !token["x-hasura-roles"]) {
    console.warn(
      "No roles found in token, ensure roles have been included in the token customisation within the application settings",
    );
    return [];
  }

  return token.roles || token["x-hasura-roles"];
};
