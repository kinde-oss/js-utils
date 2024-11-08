import { jwtDecoder, JWTDecoded } from "@kinde/jwt-decoder";
import { getActiveStorage } from ".";
import { StorageKeys } from "../../sessionManager";
/**
 *
 * @param tokenType Type of token to decode
 * @returns { Promise<JWTDecoded | null> }
 */
export const getDecodedToken = async <
  T = JWTDecoded & {
    permissions: string[];
    org_code: string;
  },
>(
  tokenType: "accessToken" | "idToken" = StorageKeys.accessToken,
): Promise<T | null> => {
  const activeStorage = getActiveStorage();

  if (!activeStorage) {
    return null;
  }

  const token = (await activeStorage.getSessionItem(
    tokenType === "accessToken" ? StorageKeys.accessToken : StorageKeys.idToken,
  )) as string;

  if (!token) {
    return null;
  }

  const decodedToken = jwtDecoder<T>(token);

  if (!decodedToken) {
    console.log("No decoded token found");
  }

  return decodedToken;
};
