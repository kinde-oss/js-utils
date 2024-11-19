// import all utils and export them as object
import { base64UrlEncode } from "./base64UrlEncode";
import { generateRandomString } from "./generateRandomString";
import { extractAuthResults } from "./extractAuthResults";
import { sanitizeUrl } from "./sanitizeUrl";
import { generateAuthUrl } from "./generateAuthUrl";
import { mapLoginMethodParamsForUrl } from "./mapLoginMethodParamsForUrl";
import { exchangeAuthCode, frameworkSettings } from "./exchangeAuthCode";

export {
  // config
  frameworkSettings,

  // utils
  base64UrlEncode,
  generateRandomString,
  extractAuthResults,
  sanitizeUrl,
  generateAuthUrl,
  mapLoginMethodParamsForUrl,
  exchangeAuthCode,
};
