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

const setActiveStorage = (store: SessionManager) => {
  storage.value = store;
};

const getActiveStorage = (): SessionManager | null => {
  return storage.value || null;
};

export {
  setActiveStorage,
  getActiveStorage,
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
