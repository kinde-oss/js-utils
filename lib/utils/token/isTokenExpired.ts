import { JWTDecoded } from "@kinde/jwt-decoder";
import { getDecodedToken } from ".";

export const calculateExpiryRealMs = async (): Promise<number | null> => {
  const token = await getDecodedToken<JWTDecoded>("accessToken");
  if (!token) return null;
  return token.exp - Math.floor(Date.now() / 1000);
};

type IsTokenExpiredProps = {
  /**
   * Threshold in seconds to expire the token before the actual expiry
   */
  threshold?: number;
};
/**
 * check if the user is authenticated with option to refresh the token
 * @returns { Promise<boolean> }
 */
export const isTokenExpired = async (
  props?: IsTokenExpiredProps,
): Promise<boolean> => {
  try {
    const token = await getDecodedToken<JWTDecoded>("accessToken");
    if (!token) return true;

    if (!token.exp) {
      console.error("Token does not have an expiry");
      return true;
    }

    return token.exp < Math.floor(Date.now() / 1000) + (props?.threshold || 0);
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
};
