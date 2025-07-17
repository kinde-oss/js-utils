import type { KindeRoles, CustomCondition } from "../../../types";
import { getRoles, type Role } from "../getRoles";

type HasRoleOptions = KindeRoles | CustomCondition<"role", KindeRoles, Role>;

const isCustomRolesCondition = (role: HasRoleOptions) => {
  return (
    typeof role === "object" &&
    role !== null &&
    "role" in role &&
    "condition" in role
  );
};

export type HasRolesParams = {
  roles: HasRoleOptions[];
  forceApi?: boolean;
};

export const hasRoles = async (params: HasRolesParams): Promise<boolean> => {
  if (!params || !params.roles || params?.roles?.length === 0) {
    // no roles provided, so assuming true

    return true;
  }

  const { roles } = params;
  let accountRoles;

  try {
    accountRoles = await getRoles({ forceApi: params.forceApi });
  } catch (error) {
    console.error("[hasRoles] Error getting roles", error);
    return false;
  }

  const roleChecks = await Promise.all(
    roles.map(async (role) => {
      if (isCustomRolesCondition(role)) {
        const matchingRole = accountRoles.find(
          (userRole) => userRole.key === role.role,
        );
        if (!matchingRole) {
          return false;
        }
        const result = await role.condition(matchingRole);
        return result;
      } else {
        const userRoleKeys = accountRoles.map((userRole) => userRole.key);
        return userRoleKeys.includes(role);
      }
    }),
  );

  return roleChecks.every((result) => result === true);
};
