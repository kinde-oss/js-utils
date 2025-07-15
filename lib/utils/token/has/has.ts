import { KindePermissions, KindeRoles } from "../../../config"
import { hasPermissions } from "./has-permissions"
import { hasRoles } from "./has-roles"

type HasParams = {
    roles?: KindeRoles[]
    permissions?: KindePermissions[]
}

export const has = async (params: HasParams): Promise<boolean> => {
    if (params.roles && !(await hasRoles({ roles: params.roles }))) {
        return false;
    }   

    if (params.permissions && !(await hasPermissions({ permissions: params.permissions }))) {
        return false;
    }


    return true;
}
