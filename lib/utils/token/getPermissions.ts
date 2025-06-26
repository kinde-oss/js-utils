import { getDecodedToken } from ".";
import { BaseAccountResponse, GetPermissionsOptions } from "../../types";
import { callAccountApi } from "./accountApi/callAccountApi";

type AccountPermissionsResult = BaseAccountResponse & {
  data: {
    org_code: string;
    permissions: { id: string; name: string; key: string }[];
  };
};

export type Permissions<T> = { orgCode: string | null; permissions: T[] };
/**
 * Get all permissions
 * @returns { Promise<Permissions> }
 */
export const getPermissions = async <T = string>(
  options?: GetPermissionsOptions,
): Promise<Permissions<T>> => {
  if (options?.hardCheck) {
    let permissions: T[] = [];

    let returnValue = await callAccountApi<AccountPermissionsResult>(
      `account_api/v1/permissions`,
    );
    permissions = returnValue.data.permissions.map(
      (permission) => permission.key,
    ) as T[];
    if (returnValue.metadata?.has_more) {
      let nextPageStartingAfter = returnValue.metadata.next_page_starting_after;
      while (returnValue.metadata.has_more) {
        returnValue = await callAccountApi<AccountPermissionsResult>(
          `account_api/v1/permissions?starting_after=${nextPageStartingAfter}`,
        );
        permissions = [
          ...permissions,
          ...(returnValue.data.permissions.map(
            (permission) => permission.key,
          ) as T[]),
        ];
        nextPageStartingAfter = returnValue.metadata.next_page_starting_after;
      }
    }
    return {
      orgCode: returnValue.data.org_code || null,
      permissions,
    };
  }

  const token = await getDecodedToken();

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
