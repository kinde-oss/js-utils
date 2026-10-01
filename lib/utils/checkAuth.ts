import {
  getActiveStorage,
  isTokenExpired,
  refreshToken,
  RefreshTokenResult,
  StorageKeys,
} from "../main";
import { getRefreshType } from "./getRefreshType";

export const checkAuth = async ({
  domain,
  clientId,
}: {
  domain: string;
  clientId: string;
}): Promise<RefreshTokenResult> => {
  if (!domain) {
    return {
      success: false,
      error: "Domain is required for authentication check",
    };
  }
  if (!clientId) {
    return {
      success: false,
      error: "Client ID is required for authentication check",
    };
  }

  // A cookie-backed session must keep using the cookie flow for every refresh
  // (including ones below driven by cached storage tokens) - see getRefreshType.
  const refreshType = getRefreshType(domain);

  const storage = getActiveStorage();

  if (storage) {
    const {
      [StorageKeys.accessToken]: accessToken,
      [StorageKeys.idToken]: idToken,
      [StorageKeys.refreshToken]: storedRefreshToken,
    } = await storage.getItems(
      StorageKeys.accessToken,
      StorageKeys.idToken,
      StorageKeys.refreshToken,
    );

    if (accessToken && idToken && storedRefreshToken) {
      if (await isTokenExpired({ threshold: 10 })) {
        return await refreshToken({
          domain,
          clientId,
          refreshType,
        });
      }

      return {
        success: true,
        accessToken: accessToken as string,
        idToken: idToken as string,
        refreshToken: storedRefreshToken as string,
      };
    }
  }

  return await refreshToken({
    domain,
    clientId,
    refreshType,
  });
};
