import { assertValidCimdClientId, assertValidRedirectUri } from "./cimd";
import { AgentAuthError } from "./errors";
import {
  assertAllowedUrl,
  assertNoOpenId,
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

const SUPPORTED_AUTH_METHODS = ["none", "client_secret_post"];

const assertSupportedAuthMethod = (method: string): void => {
  if (!SUPPORTED_AUTH_METHODS.includes(method)) {
    throw new AgentAuthError(
      "unsupported_token_auth_method",
      `token_endpoint_auth_method ${method} is not supported; use ${SUPPORTED_AUTH_METHODS.join(" or ")}`,
    );
  }
};

export const registerClient = async (
  registrationEndpoint: string,
  request: DynamicRegistrationRequest,
  options: FetchOptions = {},
): Promise<ClientIdentity> => {
  assertAllowedUrl(registrationEndpoint, "registration_endpoint", options);
  if (!request.redirectUris?.length) {
    throw new AgentAuthError(
      "invalid_client_metadata",
      "At least one redirect_uri is required",
    );
  }
  request.redirectUris.forEach(assertValidRedirectUri);

  const scopes = normalizeScope(request.scope);
  assertNoOpenId(scopes);

  const authMethod = request.tokenEndpointAuthMethod ?? "none";
  assertSupportedAuthMethod(authMethod);

  const payload = {
    client_name: request.clientName,
    redirect_uris: request.redirectUris,
    grant_types: request.grantTypes ?? ["authorization_code", "refresh_token"],
    response_types: request.responseTypes ?? ["code"],
    token_endpoint_auth_method: authMethod,
    ...(scopes.length && { scope: scopes.join(" ") }),
    ...(request.clientUri && { client_uri: request.clientUri }),
    ...(request.logoUri && { logo_uri: request.logoUri }),
  };

  const response = await postJson(
    resolveFetch(options.fetch),
    registrationEndpoint,
    payload,
    options,
  );

  if (!response.ok) {
    throw await toOAuthError(response, "Dynamic client registration");
  }

  const data = await readJson<Record<string, unknown> | null>(
    response,
    "Dynamic client registration",
  );

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new AgentAuthError(
      "invalid_response",
      "Registration response must be a JSON object",
    );
  }

  const clientId = data.client_id;
  if (typeof clientId !== "string" || !clientId) {
    throw new AgentAuthError(
      "invalid_response",
      "Registration response is missing a valid client_id",
    );
  }

  const optionalString = (field: string): string | undefined => {
    const value = data[field];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") {
      throw new AgentAuthError(
        "invalid_response",
        `Registration response field ${field} must be a string`,
      );
    }
    return value;
  };

  const clientSecret = optionalString("client_secret");
  const assignedAuthMethod = optionalString("token_endpoint_auth_method");
  const registrationAccessToken = optionalString("registration_access_token");
  const registrationClientUri = optionalString("registration_client_uri");

  if (assignedAuthMethod !== undefined) {
    assertSupportedAuthMethod(assignedAuthMethod);
    if (assignedAuthMethod === "client_secret_post" && !clientSecret) {
      throw new AgentAuthError(
        "invalid_response",
        "Registration response assigns client_secret_post but omits client_secret",
      );
    }
  }

  return {
    method: "dcr",
    clientId,
    ...(clientSecret && { clientSecret }),
    ...(registrationAccessToken && { registrationAccessToken }),
    ...(registrationClientUri && { registrationClientUri }),
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

  if (
    preRegistered?.clientId &&
    preRegistered.issuer === authorizationServer.issuer
  ) {
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
    "No usable client identity: CIMD is unsupported or not configured, no pre-registered client matches this authorization server, and dynamic registration is unavailable",
  );
};
