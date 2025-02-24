import { getDecodedToken } from ".";

/**
 * Gets all the code of the organizations the user belongs to.
 * @returns { Promise<string[] | null> }
 */
export const getUserOrganizations = async (): Promise<string[] | null> => {
  const token = await getDecodedToken<{
    org_codes: string[];
  }>("idToken");

  if (!token) {
    return null;
  }

  if (!token.org_codes && !token["x-hasura-org-codes"]) {
    console.warn(
      "Org codes not found in token, ensure org codes have been included in the token customisation within the application settings",
    );
    return null;
  }

  return token.org_codes || token["x-hasura-org-codes"];
};
