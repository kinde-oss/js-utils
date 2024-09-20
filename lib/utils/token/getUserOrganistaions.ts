import { getDecodedToken } from ".";

/**
 * Gets all the code of the organizations the user belongs to.
 * @returns { Promise<string[] | null> }
 */
export const getUserOrganizations = async (): Promise<string[] | null> => {
  return (
    (
      await getDecodedToken<{
        org_codes: string[];
      }>("idToken")
    )?.org_codes || null
  );
};
