import { jwtDecoder, JWTDecoded as JWTBase } from "@kinde/jwt-decoder";
import { getActiveStorage } from ".";
import { StorageKeys } from "../../sessionManager";
import { Role } from "./getRoles";
/**
 *
 * @param tokenType Type of token to decode
 * @returns { Promise<JWTDecoded | null> }
 */

type JWTExtra = {
  "x-hasura-permissions": never;
  "x-hasura-org-code": never;
  "x-hasura-org-codes": never;
  "x-hasura-roles": never;
  "x-hasura-feature-flags": never;

  feature_flags: Record<
    string,
    { t: "b" | "i" | "s"; v: string | boolean | number | object }
  >;
  permissions: string[];
  org_code: string;
  org_codes: string[];
  roles: Role[];
};

type JWTExtraHasura = {
  "x-hasura-permissions": string[];
  "x-hasura-org-code": string;
  "x-hasura-org-codes": string[];
  "x-hasura-roles": Role[];
  "x-hasura-feature-flags": Record<
    string,
    { t: "b" | "i" | "s"; v: string | boolean | number | object }
  >;

  feature_flags: never;
  permissions: never;
  org_codes: never;
  org_code: never;
  roles: never;
};

export type JWTDecoded = JWTBase & (JWTExtra | JWTExtraHasura);

const _decodeTokenCore = <T = JWTDecoded>(
  token: string | null,
): (T & JWTDecoded) | null => {
  if (!token) {
    return null;
  }

  const decodedToken = jwtDecoder<T & JWTDecoded>(token);
  if (!decodedToken) {
    console.warn("No decoded token found");
  }
  return decodedToken;
};

export const getDecodedToken = async <T = JWTDecoded>(
  tokenType: "accessToken" | "idToken" = StorageKeys.accessToken,
): Promise<(T & JWTDecoded) | null> => {
  const activeStorage = getActiveStorage();
  if (!activeStorage) {
    return null;
  }

  const token = (await activeStorage.getSessionItem(
    tokenType === "accessToken" ? StorageKeys.accessToken : StorageKeys.idToken,
  )) as string | null;

  return _decodeTokenCore<T>(token);
};

export const getDecodedTokenSync = <T = JWTDecoded>(
  tokenType: "accessToken" | "idToken" = StorageKeys.accessToken,
): (T & JWTDecoded) | null => {
  const activeStorage = getActiveStorage();
  if (!activeStorage) {
    return null;
  }
  if (activeStorage.asyncStore) {
    throw new Error("Active storage is async-only. Use the async helpers.");
  }
  const token = activeStorage.getSessionItem(
    tokenType === "accessToken" ? StorageKeys.accessToken : StorageKeys.idToken,
  ) as string | null;

  return _decodeTokenCore<T>(token);
};
