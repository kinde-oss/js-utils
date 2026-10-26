export type FetchLike = typeof fetch;

export interface FetchOptions {
  fetch?: FetchLike;
}

export interface CryptoAdapter {
  getRandomValues?: (array: Uint8Array) => unknown;
  sha256?: (data: Uint8Array) => Promise<ArrayBuffer | Uint8Array>;
}

export interface BearerChallenge {
  resourceMetadata?: string;
  scope?: string;
  error?: string;
  errorDescription?: string;
  realm?: string;
}

export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers?: string[];
  scopes_supported?: string[];
  bearer_methods_supported?: string[];
  resource_name?: string;
  [key: string]: unknown;
}

export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  revocation_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  client_id_metadata_document_supported?: boolean;
  authorization_response_iss_parameter_supported?: boolean;
  [key: string]: unknown;
}

export interface AgentDiscovery {
  resource: string;
  resourceMetadataUrl: string;
  resourceMetadata: ProtectedResourceMetadata;
  authorizationServer: AuthorizationServerMetadata;
  scope?: string;
}

export type ClientIdentityMethod = "cimd" | "preregistered" | "dcr";

export interface ClientIdentity {
  method: ClientIdentityMethod;
  clientId: string;
  clientSecret?: string;
  registrationAccessToken?: string;
  registrationClientUri?: string;
}

export interface PreRegisteredClient {
  clientId: string;
  clientSecret?: string;
}

export interface DynamicRegistrationRequest {
  clientName: string;
  redirectUris: string[];
  scope?: string | string[];
  grantTypes?: string[];
  responseTypes?: string[];
  tokenEndpointAuthMethod?: string;
  clientUri?: string;
  logoUri?: string;
}

export interface ClientMetadataInput {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  scope?: string | string[];
  grantTypes?: string[];
  responseTypes?: string[];
  tokenEndpointAuthMethod?: string;
  clientUri?: string;
  logoUri?: string;
  tosUri?: string;
  policyUri?: string;
  contacts?: string[];
  softwareId?: string;
  softwareVersion?: string;
}

export interface ClientMetadataDocument {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope?: string;
  client_uri?: string;
  logo_uri?: string;
  tos_uri?: string;
  policy_uri?: string;
  contacts?: string[];
  software_id?: string;
  software_version?: string;
}

export interface AuthorizationRequest {
  url: URL;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export interface TokenSet {
  accessToken: string;
  tokenType: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: number;
  scope?: string;
}
