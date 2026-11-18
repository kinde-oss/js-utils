export { base64UrlEncode, base64UrlDecode } from "./base64UrlEncode";
export { generateRandomString } from "./generateRandomString";
export { extractAuthResults } from "./extractAuthResults";
export { sanitizeUrl } from "./sanitizeUrl";
export { generateAuthUrl } from "./generateAuthUrl";
export { mapLoginMethodParamsForUrl } from "./mapLoginMethodParamsForUrl";
export {
  exchangeAuthCode,
  frameworkSettings,
  generateKindeSDKHeader,
} from "./exchangeAuthCode";
export { checkAuth } from "./checkAuth";
export { isCustomDomain } from "./isCustomDomain";
export { setRefreshTimer, clearRefreshTimer } from "./refreshTimer";
export { splitString } from "./splitString";
export { generatePortalUrl } from "./generatePortalUrl";
export { generateProfileUrl } from "./generatePortalUrl";
export { navigateToKinde } from "./navigateToKinde";
export {
  updateActivityTimestamp,
  sessionManagerActivityProxy,
} from "./activityTracking";
export { isClient } from "./isClient";
export { isServer } from "./isServer";
export { switchOrg } from "./switchOrg";
export {
  UnmetAuthenticationRequirementsError,
  LoginRequiredError,
  StepUpRequiredError,
  isStepUpSupported,
  readAuthenticationContext,
  getAuthenticationContext,
  getAuthenticationContextSync,
  hasAuthenticationContext,
  readCallbackAuthenticationError,
  stepUp,
  readStepUpState,
  buildStepUpChallenge,
  parseStepUpChallenge,
  stepUpRequiredFromResponse,
} from "./stepUp";
export type {
  AuthenticationContext,
  AuthenticationContextRequirement,
  StepUpOptions,
  ParsedStepUpChallenge,
  StepUpChallenge,
  AcrValue,
} from "./stepUp";
