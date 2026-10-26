import { AgentAuthError } from "./errors";
import {
  assertSecureUrl,
  fetchJson,
  normalizeScope,
  resolveFetch,
  stripOpenId,
} from "./http";
import type {
  AgentDiscovery,
  AuthorizationServerMetadata,
  BearerChallenge,
  FetchOptions,
  ProtectedResourceMetadata,
} from "./types";

const PARAM_PATTERN =
  /(?<![\w-])([A-Za-z_][\w-]*)\s*=\s*("(?:[^"\\]|\\.)*"|[^\s,]+)/g;

const unquote = (value: string): string =>
  value.startsWith('"') ? value.slice(1, -1).replace(/\\(.)/g, "$1") : value;

export const stripTrailingSlash = (value: string): string => {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
};

export const parseWwwAuthenticate = (
  header: string | null | undefined,
): BearerChallenge | null => {
  if (!header) return null;
  const bearerIndex = header.search(/(^|[\s,])Bearer(\s|$)/i);
  if (bearerIndex === -1) return null;

  const rest = header.slice(bearerIndex).replace(/^[\s,]*Bearer/i, "");
  const nextScheme = rest.search(/,\s*[A-Za-z][\w-]*\s+[A-Za-z_][\w-]*\s*=/);
  const section = nextScheme === -1 ? rest : rest.slice(0, nextScheme);

  const params: Record<string, string> = {};
  for (const match of section.matchAll(PARAM_PATTERN)) {
    params[match[1].toLowerCase()] = unquote(match[2]);
  }

  return {
    resourceMetadata: params["resource_metadata"],
    scope: params["scope"],
    error: params["error"],
    errorDescription: params["error_description"],
    realm: params["realm"],
  };
};

export const buildWellKnownUrl = (base: string, suffix: string): string => {
  const url = new URL(base);
  const path = stripTrailingSlash(url.pathname);
  return `${url.origin}/.well-known/${suffix}${path}`;
};

const fetchProtectedResourceMetadata = async (
  metadataUrl: string,
  options: FetchOptions,
): Promise<ProtectedResourceMetadata> => {
  assertSecureUrl(metadataUrl, "resource_metadata");
  const metadata = await fetchJson<ProtectedResourceMetadata>(
    resolveFetch(options.fetch),
    metadataUrl,
    "Protected resource metadata request",
  );
  if (!metadata || typeof metadata.resource !== "string") {
    throw new AgentAuthError(
      "invalid_response",
      "Protected resource metadata is missing resource",
    );
  }
  return metadata;
};

export const fetchAuthorizationServerMetadata = async (
  issuer: string,
  options: FetchOptions,
): Promise<AuthorizationServerMetadata> => {
  assertSecureUrl(issuer, "authorization server issuer");
  const fetchImpl = resolveFetch(options.fetch);

  const candidates = [
    buildWellKnownUrl(issuer, "oauth-authorization-server"),
    buildWellKnownUrl(issuer, "openid-configuration"),
    `${stripTrailingSlash(issuer)}/.well-known/openid-configuration`,
  ].filter((value, index, all) => all.indexOf(value) === index);

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const metadata = await fetchJson<AuthorizationServerMetadata>(
        fetchImpl,
        candidate,
        "Authorization server metadata request",
      );
      if (
        stripTrailingSlash(metadata.issuer ?? "") !== stripTrailingSlash(issuer)
      ) {
        throw new AgentAuthError(
          "issuer_mismatch",
          `Metadata issuer ${metadata.issuer} does not match ${issuer}`,
        );
      }
      if (!metadata.authorization_endpoint || !metadata.token_endpoint) {
        throw new AgentAuthError(
          "invalid_response",
          "Authorization server metadata is missing required endpoints",
        );
      }
      return metadata;
    } catch (error) {
      lastError = error;
      if (error instanceof AgentAuthError && error.code === "issuer_mismatch") {
        throw error;
      }
    }
  }

  throw new AgentAuthError(
    "metadata_unavailable",
    `Unable to load authorization server metadata for ${issuer}`,
    undefined,
    { cause: lastError },
  );
};

export interface DiscoverAgentAuthOptions extends FetchOptions {
  response?: Pick<Response, "status" | "headers">;
  wwwAuthenticate?: string | null;
  resourceUrl: string;
  preferredIssuer?: string;
}

export const discoverAgentAuth = async (
  options: DiscoverAgentAuthOptions,
): Promise<AgentDiscovery> => {
  const { response, resourceUrl, preferredIssuer } = options;

  if (!resourceUrl) {
    throw new AgentAuthError(
      "invalid_url",
      "resourceUrl is required to validate the resource metadata",
    );
  }

  if (response && response.status !== 401) {
    throw new AgentAuthError(
      "not_unauthorized",
      `Expected a 401 response but received ${response.status}`,
      response.status,
    );
  }

  const header =
    options.wwwAuthenticate ?? response?.headers.get("www-authenticate");
  const challenge = parseWwwAuthenticate(header);

  const metadataUrl =
    challenge?.resourceMetadata ??
    buildWellKnownUrl(resourceUrl, "oauth-protected-resource");

  const resourceMetadata = await fetchProtectedResourceMetadata(
    metadataUrl,
    options,
  );

  if (
    stripTrailingSlash(resourceMetadata.resource) !==
    stripTrailingSlash(resourceUrl)
  ) {
    throw new AgentAuthError(
      "resource_mismatch",
      `Resource metadata describes ${resourceMetadata.resource}, not ${resourceUrl}`,
    );
  }

  const servers = resourceMetadata.authorization_servers ?? [];
  if (!servers.length) {
    throw new AgentAuthError(
      "no_authorization_server",
      "Resource metadata lists no authorization servers",
    );
  }
  const issuer =
    preferredIssuer && servers.includes(preferredIssuer)
      ? preferredIssuer
      : servers[0];

  const authorizationServer = await fetchAuthorizationServerMetadata(
    issuer,
    options,
  );

  const scope = stripOpenId(normalizeScope(challenge?.scope)).join(" ");

  return {
    resource: resourceMetadata.resource,
    resourceMetadataUrl: metadataUrl,
    resourceMetadata,
    authorizationServer,
    ...(scope && { scope }),
  };
};
