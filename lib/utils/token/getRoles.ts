import { getDecodedToken } from ".";

export type Role = { id: string; name: string; key: string };

/**
 * Get all permissions
 * @returns { Promise<Role[]> }
 */
export const getRoles = async (): Promise<Role[]> => {
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
