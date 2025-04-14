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
} from "./utils";

export {
  getClaim,
  getClaims,
  getCurrentOrganization,
  getDecodedToken,
  getFlag,
  getUserProfile,
  getPermission,
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

export const ExpoSecureStore = {
  __esModule: true,
  get default() {
    return import("./sessionManager/stores/expoSecureStore.js").then(
      (mod) => mod.ExpoSecureStore,
    );
  },
};

export type { SessionManager } from "./sessionManager";
