import { getDecodedToken } from ".";

export type Permissions<T> = { orgCode: string | null; permissions: T[] };
/**
 * Get all permissions
 * @returns { Promise<Permissions> }
 */
export const getRoles = async (): Promise<string[]> => {
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

  return token.roles || token["x-hasura-roles"] || [];
};
