// By having this empty interface here, we tell TS that it exists
// and exporting it allows for augmentation
// 
// because we use Override for InternalKindeConfig, anything the user hasn't provided
// (or not code-genned) will fallback to what's in BaseKindeConfig
export interface KindeConfig {}

interface BaseKindeConfig {
    roles: string[]
    permissions: string[]
}

export type InternalKindeConfig = Omit<BaseKindeConfig, keyof KindeConfig> & KindeConfig
export type KindeRoles = InternalKindeConfig['roles'][number]
export type KindePermissions = InternalKindeConfig['permissions'][number]
