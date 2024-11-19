import { SessionManager } from "../../sessionManager";

import { getClaim } from "./getClaim";
import { getClaims } from "./getClaims";
import { getCurrentOrganization } from "./getCurrentOrganization";
import { getDecodedToken } from "./getDecodedToken";
import { getFlag } from "./getFlag";
import { getUserProfile, UserProfile } from "./getUserProfile";
import { getPermission, PermissionAccess } from "./getPermission";
import { getPermissions, Permissions } from "./getPermissions";
import { getUserOrganizations } from "./getUserOrganistaions";
import { getRoles } from "./getRoles";
import { isAuthenticated } from "./isAuthenticated";
import { refreshToken } from "./refreshToken";

const storage = {
  secure: null as SessionManager | null,
  insecure: null as SessionManager | null,
};

/**
 * Sets the active storage
 * @param store Session manager instance
 */
const setActiveStorage = (store: SessionManager) => {
  storage.secure = store;
};

/**
 * Gets the current active storage
 * @returns Session manager instance or null
 */
const getActiveStorage = (): SessionManager | null => {
  return storage.secure || null;
};

/**
 * Checks if there is an active storage
 * @returns boolean
 */
const hasActiveStorage = (): boolean => {
  return storage.secure !== null;
};

/**
 * Clears the active storage
 */
const clearActiveStorage = (): void => {
  storage.secure = null;
};

/**
 * Sets the active storage
 * @param store Session manager instance
 */
const setInsecureStorage = (store: SessionManager) => {
  storage.insecure = store;
};

/**
 * Gets the current active storage
 * @returns Session manager instance or null
 */
const getInsecureStorage = (): SessionManager | null => {
  return storage.insecure || storage.secure || null;
};

/**
 * Checks if there is an active storage
 * @returns boolean
 */
const hasInsecureStorage = (): boolean => {
  return storage.insecure !== null;
};

/**
 * Clears the active storage
 */
const clearInsecureStorage = (): void => {
  storage.insecure = null;
};

export {
  // main store
  setActiveStorage,
  getActiveStorage,
  hasActiveStorage,
  clearActiveStorage,

  // insecure store
  setInsecureStorage,
  getInsecureStorage,
  hasInsecureStorage,
  clearInsecureStorage,

  // helpers
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
};

export type { UserProfile, Permissions, PermissionAccess };
