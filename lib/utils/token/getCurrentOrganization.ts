import {
  getDecodedToken,
  getDecodedTokenSync,
  JWTDecoded,
} from "./getDecodedToken";

/**
 *
 * @param keyName key to get from the token
 * @returns { Promise<string | number | string[] | null> }
 **/
export const getCurrentOrganization = async (): Promise<string | null> => {
  const decodedToken = await getDecodedToken();
  return _getCurrentOrganizationCore(decodedToken);
};

export const getCurrentOrganizationSync = (): string | null => {
  const decodedToken = getDecodedTokenSync();
  return _getCurrentOrganizationCore(decodedToken);
};

const _getCurrentOrganizationCore = (
  decodedToken: JWTDecoded | null,
): string | null => {
  if (!decodedToken) {
    return null;
  }
  return decodedToken.org_code || decodedToken["x-hasura-org-code"];
};
