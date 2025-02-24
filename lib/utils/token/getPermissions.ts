import { getDecodedToken } from ".";

export type Permissions<T> = { orgCode: string | null; permissions: T[] };
/**
 * Get all permissions
 * @returns { Promise<Permissions> }
 */
export const getPermissions = async <T = string>(): Promise<Permissions<T>> => {
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
