import { JWTDecoded } from "@kinde/jwt-decoder";
import { getClaims, getClaimsSync } from "./getClaims";

const _getClaimCore = <T, V = string | number | string[] | null>(
  claims: T | null,
  keyName: keyof T,
): { name: keyof T; value: V } | null => {
  if (!claims) {
    return null;
  }
  return {
    name: keyName,
    value: (claims as T)[keyName] as unknown as V,
  };
};

/**
 *
 * @param keyName key to get from the token
 * @param {("accessToken"|"idToken")} [tokenType="accessToken"] - Type of token to get claims from
 * @returns { Promise<string | number | string[] | null> }
 */
export const getClaim = async <T = JWTDecoded, V = string | number | string[]>(
  keyName: keyof T,
  tokenType: "accessToken" | "idToken" = "accessToken",
): Promise<{
  name: keyof T;
  value: V;
} | null> => {
  const claims = await getClaims<T>(tokenType);
  return _getClaimCore<T, V>(claims, keyName);
};

export const getClaimSync = <T = JWTDecoded, V = string | number | string[]>(
  keyName: keyof T,
  tokenType: "accessToken" | "idToken" = "accessToken",
): {
  name: keyof T;
  value: V;
} | null => {
  const claims = getClaimsSync<T>(tokenType);
  return _getClaimCore<T, V>(claims, keyName);
};
