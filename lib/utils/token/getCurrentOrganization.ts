import { getDecodedToken } from "./getDecodedToken";

/**
 *
 * @param keyName key to get from the token
 * @returns { Promise<string | number | string[] | null> }
 **/
export const getCurrentOrganization = async (): Promise<string | null> => {
  const decodedToken = await getDecodedToken();

  if (!decodedToken) {
    return null;
  }

  return decodedToken.org_code || decodedToken["x-hasura-org-code"];
};
