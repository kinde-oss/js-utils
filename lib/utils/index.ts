// import all utils and export them as object
import { base64UrlEncode } from "./base64UrlEncode";
import { generateRandomString } from "./generateRandomString";
import { extractAuthResults } from "./extractAuthResults";
import { sanatizeURL } from "./sanatizeUrl";
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
  sanatizeURL,
  generateAuthUrl,
  mapLoginMethodParamsForUrl,
  exchangeAuthCode,
};
