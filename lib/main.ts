import { StorageKeys } from "./sessionManager";

export * from "./types";

export {
  base64UrlEncode,
  generateRandomString,
  extractAuthResults,
  sanitizeUrl,
  generateAuthUrl,
  mapLoginMethodParamsForUrl,
  exchangeAuthCode,
  checkAuth,
  isCustomDomain,
  setRefreshTimer,
  clearRefreshTimer,
  frameworkSettings,
  splitString,
  generateProfileUrl,
  generatePortalUrl,
  generateKindeSDKHeader,
  navigateToKinde,
  updateActivityTimestamp,
  sessionManagerActivityProxy,
  isClient,
  isServer,
  getCookieOptions,
} from "./utils";
export type { CookieEnv, CookieOptions, CookieOptionValue } from "./utils";

export {
  getClaim,
  getClaimSync,
  getClaims,
  getClaimsSync,
  getCurrentOrganization,
  getCurrentOrganizationSync,
  getRawToken,
  getRawTokenSync,
  getDecodedToken,
  getDecodedTokenSync,
  getFlag,
  getFlagSync,
  getUserProfile,
  getUserProfileSync,
  getPermission,
  getPermissionSync,
  getEntitlement,
  getEntitlements,
  getPermissions,
  getPermissionsSync,
  getUserOrganizations,
  getUserOrganizationsSync,
  getRoles,
  getRolesSync,
  isAuthenticated,
  isTokenExpired,
  refreshToken,
  setActiveStorage,
  getActiveStorage,
  hasActiveStorage,
  clearActiveStorage,
  setInsecureStorage,
  getInsecureStorage,
  hasInsecureStorage,
  clearInsecureStorage,
  has,
  hasPermissions,
  hasRoles,
  hasFeatureFlags,
  hasBillingEntitlements,
} from "./utils/token";

export type {
  UserProfile,
  Permissions,
  Role,
  PermissionAccess,
} from "./utils/token";

export {
  storageSettings,
  MemoryStorage,
  ChromeStore,
  LocalStorage,
  StorageKeys,
  SessionBase,
  TimeoutActivityType,
} from "./sessionManager";

// This export provides an implementation of SessionManager<V>
export const ExpoSecureStore: {
  __esModule: true;
  default: <V extends string = StorageKeys>() => Promise<
    typeof import("./sessionManager/stores/expoSecureStore.js").ExpoSecureStore<V>
  >;
} = {
  __esModule: true,
  default: async <V extends string = StorageKeys>() => {
    const mod = await import(
      /* webpackIgnore: true */ "./sessionManager/stores/expoSecureStore.js"
    );
    return mod.ExpoSecureStore as typeof mod.ExpoSecureStore<V>;
  },
};

export type { SessionManager, TimeoutTokenData } from "./sessionManager";
