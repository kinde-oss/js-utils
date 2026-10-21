export { AgentAuthError } from "./errors";
export type { AgentAuthErrorCode } from "./errors";

export { parseWwwAuthenticate, discoverAgentAuth } from "./discovery";
export type { DiscoverAgentAuthOptions } from "./discovery";

export { resolveClientIdentity, registerClient } from "./clientIdentity";
export type { ResolveClientIdentityOptions } from "./clientIdentity";

export { buildClientMetadataDocument } from "./cimd";

export { buildAuthorizationUrl } from "./authorize";
export type { BuildAuthorizationUrlOptions } from "./authorize";

export { exchangeCode, refreshAccessToken, revokeToken } from "./token";
export type {
  ExchangeCodeOptions,
  RefreshAccessTokenOptions,
  RevokeTokenOptions,
} from "./token";

export type * from "./types";
