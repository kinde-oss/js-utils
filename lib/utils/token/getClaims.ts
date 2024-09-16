import { JWTDecoded } from "@kinde/jwt-decoder";
import { getDecodedToken } from "./getDecodedToken";

/**
 * get all claims from the token
 * @returns { Promise<T | null> }
 */
export const getClaims = async <T = JWTDecoded>(): Promise<T | null> => {
  return getDecodedToken<T>("accessToken");
};
