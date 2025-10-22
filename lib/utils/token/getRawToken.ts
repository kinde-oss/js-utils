import { getActiveStorage } from ".";
import { StorageKeys } from "../../sessionManager";

export const getRawToken = async (
  tokenType: "accessToken" | "idToken" = StorageKeys.accessToken,
): Promise<string | null> => {
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

  return token;
};

export const getRawTokenSync = (
  tokenType: "accessToken" | "idToken" = StorageKeys.accessToken,
): string | null => {
  const activeStorage = getActiveStorage();

  if (!activeStorage || activeStorage.asyncStore) {
    return null;
  }

  const token = activeStorage.getSessionItem(
    tokenType === "accessToken" ? StorageKeys.accessToken : StorageKeys.idToken,
  ) as string | null;

  if (!token) {
    return null;
  }

  return token;
};
