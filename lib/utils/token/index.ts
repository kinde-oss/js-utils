import { SessionManager } from "../../sessionManager";

export {
  has,
  hasPermissions,
  hasRoles,
  hasFeatureFlags,
  hasBillingEntitlements,
} from "./has";
export { getClaim } from "./getClaim";
export { getClaims } from "./getClaims";
export { getCurrentOrganization } from "./getCurrentOrganization";
export { getDecodedToken } from "./getDecodedToken";
export { getRawToken } from "./getRawToken";
export { getFlag } from "./getFlag";
export { getFlags } from "./getFlags";
export { getUserProfile } from "./getUserProfile";
export type { UserProfile } from "./getUserProfile";
export { getPermission } from "./getPermission";
export type { PermissionAccess } from "./getPermission";
export { getPermissions } from "./getPermissions";
export type { Permissions } from "./getPermissions";
export { getUserOrganizations } from "./getUserOrganizations";
export { getRoles } from "./getRoles";
export type { Role } from "./getRoles";
export { isAuthenticated } from "./isAuthenticated";
export { refreshToken } from "./refreshToken";
export { getEntitlements } from "./getEntitlements";
const storage = {
  secure: null as SessionManager | null,
  insecure: null as SessionManager | null,
};

/**
 * Sets the active storage
 * @param store Session manager instance
 */
export const setActiveStorage = (store: SessionManager) => {
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
