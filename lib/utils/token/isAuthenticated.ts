import { refreshToken } from ".";
import { isTokenExpired } from ".";

export interface IsAuthenticatedPropsWithRefreshToken {
  useRefreshToken?: true;
  domain: string;
  clientId: string;
  /**
   * Threshold in seconds to expire the token before the actual expiry
   */
  expiredThreshold?: number;
}

export interface IsAuthenticatedPropsWithoutRefreshToken {
  useRefreshToken?: false;
  domain?: never;
  clientId?: never;
  expiredThreshold?: number;
}

type IsAuthenticatedProps =
  | IsAuthenticatedPropsWithRefreshToken
  | IsAuthenticatedPropsWithoutRefreshToken;

/**
 * check if the user is authenticated with option to refresh the token
 * @returns { Promise<boolean> }
 */
export const isAuthenticated = async (
  props?: IsAuthenticatedProps,
): Promise<boolean> => {
  try {
    const isExpired = await isTokenExpired({
      threshold: props?.expiredThreshold,
    });

    if (isExpired && props?.useRefreshToken) {
      const refreshResult = await refreshToken({
        domain: props.domain,
        clientId: props.clientId,
      });
      return refreshResult.success;
    }
    return !isExpired;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
};
