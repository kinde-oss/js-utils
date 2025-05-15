import {
  isCustomDomain,
  refreshToken,
  RefreshTokenResult,
  RefreshType,
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
