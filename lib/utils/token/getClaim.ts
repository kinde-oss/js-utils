import { JWTDecoded } from "@kinde/jwt-decoder";
import { getDecodedToken } from "./getDecodedToken";

/**
 *
 * @param keyName key to get from the token
 * @returns { Promise<string | number | string[] | null> }
 */
export const getClaim = async <T = JWTDecoded, V = string | number | string[]>(
  keyName: keyof T,
): Promise<{
  name: keyof T;
  value: V;
} | null> => {
  const claims = await getDecodedToken<T>("accessToken");
  if (!claims) {
    return null;
  }
  return {
    name: keyName,
    value: claims[keyName] as V,
  };
};
