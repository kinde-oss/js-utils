import { getDecodedToken } from ".";
import { getDecodedTokenSync, JWTDecoded } from "./getDecodedToken";

/**
 * Gets all the code of the organizations the user belongs to.
 * @returns { Promise<string[] | null> }
 */
export const getUserOrganizations = async (): Promise<string[] | null> => {
  const token = await getDecodedToken("idToken");
  return _getUserOrganizationsCore(token);
};

export const getUserOrganizationsSync = (): string[] | null => {
  const token = getDecodedTokenSync("idToken");
  return _getUserOrganizationsCore(token);
};

const _getUserOrganizationsCore = (
  token: JWTDecoded | null,
): string[] | null => {
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
