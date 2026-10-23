import { assertValidCimdClientId, assertValidRedirectUri } from "./cimd";
import { AgentAuthError } from "./errors";
import {
  assertNoOpenId,
  assertSecureUrl,
  normalizeScope,
  postJson,
  readJson,
  resolveFetch,
  toOAuthError,
} from "./http";
import type {
  AuthorizationServerMetadata,
  ClientIdentity,
  DynamicRegistrationRequest,
  FetchOptions,
  PreRegisteredClient,
} from "./types";

export const registerClient = async (
  registrationEndpoint: string,
  request: DynamicRegistrationRequest,
  options: FetchOptions = {},
): Promise<ClientIdentity> => {
  assertSecureUrl(registrationEndpoint, "registration_endpoint");
  if (!request.redirectUris?.length) {
    throw new AgentAuthError(
      "invalid_client_metadata",
      "At least one redirect_uri is required",
    );
  }
  request.redirectUris.forEach(assertValidRedirectUri);

  const scopes = normalizeScope(request.scope);
  assertNoOpenId(scopes);

  const payload = {
    client_name: request.clientName,
    redirect_uris: request.redirectUris,
    grant_types: request.grantTypes ?? ["authorization_code", "refresh_token"],
    response_types: request.responseTypes ?? ["code"],
    token_endpoint_auth_method: request.tokenEndpointAuthMethod ?? "none",
    ...(scopes.length && { scope: scopes.join(" ") }),
    ...(request.clientUri && { client_uri: request.clientUri }),
    ...(request.logoUri && { logo_uri: request.logoUri }),
  };

  const response = await postJson(
    resolveFetch(options.fetch),
    registrationEndpoint,
    payload,
  );

  if (!response.ok) {
    throw await toOAuthError(response, "Dynamic client registration");
  }

  const data = await readJson<{
    client_id?: string;
    client_secret?: string;
    registration_access_token?: string;
    registration_client_uri?: string;
  }>(response, "Dynamic client registration");

  if (!data?.client_id) {
    throw new AgentAuthError(
      "invalid_response",
      "Registration response is missing client_id",
    );
  }

  return {
    method: "dcr",
    clientId: data.client_id,
    ...(data.client_secret && { clientSecret: data.client_secret }),
    ...(data.registration_access_token && {
      registrationAccessToken: data.registration_access_token,
    }),
    ...(data.registration_client_uri && {
      registrationClientUri: data.registration_client_uri,
    }),
  };
};

export interface ResolveClientIdentityOptions extends FetchOptions {
  authorizationServer: AuthorizationServerMetadata;
  cimdClientId?: string;
  preRegistered?: PreRegisteredClient;
  registration?: DynamicRegistrationRequest;
}

export const resolveClientIdentity = async (
  options: ResolveClientIdentityOptions,
): Promise<ClientIdentity> => {
  const { authorizationServer, cimdClientId, preRegistered, registration } =
    options;

  if (
    cimdClientId &&
    authorizationServer.client_id_metadata_document_supported === true
  ) {
    assertValidCimdClientId(cimdClientId);
    return { method: "cimd", clientId: cimdClientId };
  }

  if (preRegistered?.clientId) {
    return {
      method: "preregistered",
      clientId: preRegistered.clientId,
      ...(preRegistered.clientSecret && {
        clientSecret: preRegistered.clientSecret,
      }),
    };
  }

  if (registration && authorizationServer.registration_endpoint) {
    return registerClient(
      authorizationServer.registration_endpoint,
      registration,
      options,
    );
  }

  throw new AgentAuthError(
    "no_client_identity",
    "No usable client identity: CIMD is unsupported or not configured, no pre-registered client was provided, and dynamic registration is unavailable",
  );
};
