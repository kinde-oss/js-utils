import { KindeRoles } from "../../../config"
import { getRoles } from "../getRoles"

type HasRolesParams = {
    roles?: KindeRoles[]
}

export const hasRoles = async (
    params: HasRolesParams
): Promise<boolean> => {
    const { roles } = params
    
    if (!roles || roles.length === 0) {
        return true
    }
    
    const userRoles = await getRoles()
    const userRoleKeys = userRoles.map(role => role.key)
    
    return roles.every(role => userRoleKeys.includes(role))
}
