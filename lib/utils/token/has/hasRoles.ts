import { KindeRoles, CustomCondition } from "../../../types";
import { getRoles, Role } from "../getRoles";

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
};

export const hasRoles = async (params: HasRolesParams): Promise<boolean> => {
  if (!params || !params.roles || params?.roles?.length === 0) {
    // no roles provided, so assuming true

    return true;
  }

  const { roles } = params;

  const roleChecks = await Promise.all(
    roles.map(async (role) => {
      if (isCustomRolesCondition(role)) {
        const userRoles = await getRoles();
        const matchingRole = userRoles.find(
          (userRole) => userRole.key === role.role,
        );
        if (!matchingRole) {
          return false;
        }
        const result = await role.condition(matchingRole);
        return result;
      } else {
        const userRoles = await getRoles();
        const userRoleKeys = userRoles.map((userRole) => userRole.key);
        return userRoleKeys.includes(role);
      }
    }),
  );

  return roleChecks.every((result) => result === true);
};
