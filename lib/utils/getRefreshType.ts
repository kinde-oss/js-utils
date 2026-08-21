import { isCustomDomain } from "./isCustomDomain";
import { getCookie } from "./getCookie";
import { storageSettings } from "../sessionManager";
import { RefreshType } from "../main";

const kindeCookieName = "_kbrte";

/**
 * A cookie-backed session (custom domain, secure storage) must keep using the
 * cookie refresh flow so the httpOnly refresh cookie stays rotated; a
 * credentialed body-based refresh would otherwise send the refresh token twice.
 */
export const getRefreshType = (domain: string): RefreshType => {
  const usingCustomDomain = isCustomDomain(domain);
  const forceLocalStorage = storageSettings.useInsecureForRefreshToken;
  const kbrteCookie =
    usingCustomDomain && !forceLocalStorage ? getCookie(kindeCookieName) : null;
  return kbrteCookie ? RefreshType.cookie : RefreshType.refreshToken;
};
