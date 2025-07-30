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
} from "./utils";

export {
  getClaim,
  getClaims,
  getCurrentOrganization,
  getRawToken,
  getDecodedToken,
  getFlag,
  getUserProfile,
  getPermission,
  getEntitlements,
  getPermissions,
  getUserOrganizations,
  getRoles,
  isAuthenticated,
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

export type { SessionManager } from "./sessionManager";
