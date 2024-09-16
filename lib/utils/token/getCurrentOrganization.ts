import { getClaim } from "./getClaim";

/**
 *
 * @param keyName key to get from the token
 * @returns { Promise<string | number | string[] | null> }
 **/
export const getCurrentOrganization = async (): Promise<string | null> => {
  return (
    (await getClaim<{ org_code: string }, string>("org_code"))?.value || null
  );
};
