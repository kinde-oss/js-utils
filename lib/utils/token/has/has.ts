import {
  KindePermissions,
  KindeRoles,
  KindeFeatureFlags,
} from "../../../types";
import { hasPermissions } from "./hasPermissions";
import { hasRoles } from "./hasRoles";
import { hasFeatureFlags } from "./hasFeatureFlags";

type HasParams = {
  roles?: KindeRoles[];
  permissions?: KindePermissions[];
  featureFlags?: KindeFeatureFlags[];
};

export const has = async (params: HasParams): Promise<boolean> => {
  if (params.roles && !(await hasRoles({ roles: params.roles }))) {
    return false;
  }

  if (
    params.permissions &&
    !(await hasPermissions({ permissions: params.permissions }))
  ) {
    return false;
  }

  if (
    params.featureFlags &&
    !(await hasFeatureFlags({ featureFlags: params.featureFlags }))
  ) {
    return false;
  }

  return true;
};
