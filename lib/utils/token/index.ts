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

const storage = {
  value: null as SessionManager | null,
};

/**
 * Sets the active storage
 * @param store Session manager instance
 */
const setActiveStorage = (store: SessionManager) => {
  storage.value = store;
};

/**
 * Gets the current active storage
 * @returns Session manager instance or null
 */
const getActiveStorage = (): SessionManager | null => {
  return storage.value || null;
};

/**
 * Checks if there is an active storage
 * @returns boolean
 */
const hasActiveStorage = (): boolean => {
  return storage.value !== null;
};

const clearActiveStorage = (): void => {
  storage.value = null;
};

export {
  setActiveStorage,
  getActiveStorage,
  hasActiveStorage,
  clearActiveStorage,
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
};

export type { UserProfile, Permissions, PermissionAccess };
