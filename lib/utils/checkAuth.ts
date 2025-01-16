import { isCustomDomain, refreshToken, storageSettings } from "../main";
import { getCookie } from "./getCookie";
import { RefreshType, RefreshTokenResult } from "./token/refreshToken";

const kindeCookieName = "_kbrte";

export const checkAuth = async ({
  domain,
  clientId,
}: {
  domain: string;
  clientId: string;
}): Promise<RefreshTokenResult> => {
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
