import { JWTDecoded } from "@kinde/jwt-decoder";
import { getDecodedToken } from "./getDecodedToken";

/**
 * get all claims from the token
 * @param {("accessToken"|"idToken")} [tokenType="accessToken"] - Type of token to get claims from
 * @returns { Promise<T | null> }
 */
export const getClaims = async <T = JWTDecoded>(
  tokenType: "accessToken" | "idToken" = "accessToken",
): Promise<T | null> => {
  return getDecodedToken<T>(tokenType);
};
