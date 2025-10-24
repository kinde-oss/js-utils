import { SessionManager, storageSettings } from "../../sessionManager";
import { sessionManagerActivityProxy } from "../activityTracking";

export {
  has,
  hasPermissions,
  hasRoles,
  hasFeatureFlags,
  hasBillingEntitlements,
} from "./has";
export { getClaim, getClaimSync } from "./getClaim";
export { getClaims, getClaimsSync } from "./getClaims";
export { getCurrentOrganization } from "./getCurrentOrganization";
export { getCurrentOrganizationSync } from "./getCurrentOrganization";
export { getDecodedToken, getDecodedTokenSync } from "./getDecodedToken";
export { getRawToken, getRawTokenSync } from "./getRawToken";
export { getFlag } from "./getFlag";
export { getFlagSync } from "./getFlag";
export { getFlags } from "./getFlags";
export { getFlagsSync } from "./getFlags";
export { getUserProfile } from "./getUserProfile";
export { getUserProfileSync } from "./getUserProfile";
export type { UserProfile } from "./getUserProfile";
export { getPermission } from "./getPermission";
export { getPermissionSync } from "./getPermission";
export type { PermissionAccess } from "./getPermission";
export { getPermissions } from "./getPermissions";
export { getPermissionsSync } from "./getPermissions";
export type { Permissions } from "./getPermissions";
export { getUserOrganizations } from "./getUserOrganizations";
export { getUserOrganizationsSync } from "./getUserOrganizations";
export { getRoles } from "./getRoles";
export { getRolesSync } from "./getRoles";
export type { Role } from "./getRoles";
export { isAuthenticated } from "./isAuthenticated";
export { isTokenExpired } from "./isTokenExpired";
export { refreshToken } from "./refreshToken";
export { getEntitlements } from "./getEntitlements";
export { getEntitlement } from "./getEntitlement";
const storage = {
  secure: null as SessionManager | null,
  insecure: null as SessionManager | null,
};

/**
 * Sets the active storage
 * @param store Session manager instance
 */
export const setActiveStorage = (store: SessionManager) => {
  if (storageSettings.activityTimeoutMinutes) {
    storage.secure = sessionManagerActivityProxy(store);
    return;
  }
  storage.secure = store;
};

/**
 * Gets the current active storage
 * @returns Session manager instance or null
 */
export const getActiveStorage = (): SessionManager | null => {
  return storage.secure || null;
};

/**
 * Checks if there is an active storage
 * @returns boolean
 */
export const hasActiveStorage = (): boolean => {
  return storage.secure !== null;
};

/**
 * Clears the active storage
 */
export const clearActiveStorage = (): void => {
  storage.secure = null;
};

/**
 * Sets the active storage
 * @param store Session manager instance
 */
export const setInsecureStorage = (store: SessionManager) => {
  if (storageSettings.activityTimeoutMinutes) {
    storage.insecure = sessionManagerActivityProxy(store);
    return;
  }

  storage.insecure = store;
};

/**
 * Gets the current active storage
 * @returns Session manager instance or null
 */
export const getInsecureStorage = (): SessionManager | null => {
  return storage.insecure || storage.secure || null;
};

/**
 * Checks if there is an active storage
 * @returns boolean
 */
export const hasInsecureStorage = (): boolean => {
  return storage.insecure !== null;
};

/**
 * Clears the active storage
 */
export const clearInsecureStorage = (): void => {
  storage.insecure = null;
};
