import { AgentAuthError } from "./errors";
import { assertNoOpenId, normalizeScope, parseUrl } from "./http";
import type { ClientMetadataDocument, ClientMetadataInput } from "./types";

const FORBIDDEN_REDIRECT_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
]);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const invalid = (message: string) =>
  new AgentAuthError("invalid_client_metadata", message);

export const assertValidCimdClientId = (clientId: string): URL => {
  const url = parseUrl(clientId, "client_id");
  if (url.protocol !== "https:") throw invalid("client_id must use https");
  if (url.pathname === "/" || url.pathname === "") {
    throw invalid("client_id must contain a path");
  }
  if (url.hash) throw invalid("client_id must not contain a fragment");
  if (url.username || url.password) {
    throw invalid("client_id must not contain credentials");
  }
  const rawPath = clientId.split(/[?#]/)[0].replace(/^https:\/\/[^/]*/i, "");
  if (rawPath.split("/").some((s) => s === "." || s === "..")) {
    throw invalid("client_id must not contain dot path segments");
  }
  return url;
};

export const assertValidRedirectUri = (redirectUri: string): void => {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw invalid(`redirect_uri is not a valid URL: ${redirectUri}`);
  }
  if (url.hash) throw invalid("redirect_uri must not contain a fragment");
  if (FORBIDDEN_REDIRECT_SCHEMES.has(url.protocol)) {
    throw invalid(`redirect_uri scheme not allowed: ${url.protocol}`);
  }
  if (url.protocol === "http:" && !LOOPBACK_HOSTS.has(url.hostname)) {
    throw invalid("http redirect_uri is only allowed for loopback hosts");
  }
};

export const buildClientMetadataDocument = (
  input: ClientMetadataInput,
): ClientMetadataDocument => {
  assertValidCimdClientId(input.clientId);

  if (!input.clientName?.trim()) throw invalid("client_name is required");
  if (!input.redirectUris?.length) {
    throw invalid("At least one redirect_uri is required");
  }
  input.redirectUris.forEach(assertValidRedirectUri);

  const scopes = normalizeScope(input.scope);
  assertNoOpenId(scopes);

  const tokenEndpointAuthMethod = input.tokenEndpointAuthMethod ?? "none";
  if (tokenEndpointAuthMethod !== "none") {
    throw invalid(
      "CIMD clients cannot use shared secrets; token_endpoint_auth_method must be none",
    );
  }

  const document: ClientMetadataDocument = {
    client_id: input.clientId,
    client_name: input.clientName,
    redirect_uris: [...new Set(input.redirectUris)],
    grant_types: input.grantTypes ?? ["authorization_code", "refresh_token"],
    response_types: input.responseTypes ?? ["code"],
    token_endpoint_auth_method: tokenEndpointAuthMethod,
  };

  if (scopes.length) document.scope = scopes.join(" ");
  if (input.clientUri) document.client_uri = input.clientUri;
  if (input.logoUri) document.logo_uri = input.logoUri;
  if (input.tosUri) document.tos_uri = input.tosUri;
  if (input.policyUri) document.policy_uri = input.policyUri;
  if (input.contacts?.length) document.contacts = input.contacts;
  if (input.softwareId) document.software_id = input.softwareId;
  if (input.softwareVersion) document.software_version = input.softwareVersion;

  return document;
};
