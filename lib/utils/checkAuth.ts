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
  console.log("usingCustomDomain", usingCustomDomain);
  console.log("forceLocalStorage", forceLocalStorage);
  let kbrteCookie = null;
  if (usingCustomDomain && !forceLocalStorage) {
    console.log("getting cookie");
    kbrteCookie = getCookie(kindeCookieName);
    console.log("kbrteCookie", kbrteCookie);
  }

  return await refreshToken({
    domain,
    clientId,
    refreshType: kbrteCookie ? RefreshType.cookie : RefreshType.refreshToken,
  });
};
