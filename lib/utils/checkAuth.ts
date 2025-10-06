import {
  getActiveStorage,
  isCustomDomain,
  isTokenExpired,
  refreshToken,
  RefreshTokenResult,
  RefreshType,
  StorageKeys,
  storageSettings,
} from "../main";
import { getCookie } from "./getCookie";

const kindeCookieName = "_kbrte";

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
          refreshType: RefreshType.refreshToken,
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

  const usingCustomDomain = isCustomDomain(domain);
  const forceLocalStorage = storageSettings.useInsecureForRefreshToken;
  let kbrteCookie = null;
  if (usingCustomDomain && !forceLocalStorage) {
    kbrteCookie = getCookie(kindeCookieName);
  }

  return await refreshToken({
    domain,
    clientId,
    refreshType: kbrteCookie ? RefreshType.cookie : RefreshType.refreshToken,
  });
};
