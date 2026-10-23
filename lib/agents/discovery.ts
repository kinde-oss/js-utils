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

const stripTrailingSlash = (value: string): string => {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
};

const isSpace = (char: string): boolean =>
  char === " " || char === "\t" || char === "\r" || char === "\n";

const parseChallenges = (
  header: string,
): { scheme: string; params: Record<string, string> }[] => {
  const challenges: { scheme: string; params: Record<string, string> }[] = [];
  const length = header.length;
  let i = 0;

  const skipSeparators = () => {
    while (i < length && (isSpace(header[i]) || header[i] === ",")) i++;
  };
  const skipSpaces = () => {
    while (i < length && isSpace(header[i])) i++;
  };

  while (i < length) {
    skipSeparators();
    if (i >= length) break;

    const tokenStart = i;
    while (
      i < length &&
      !isSpace(header[i]) &&
      header[i] !== "," &&
      header[i] !== "="
    ) {
      i++;
    }
    const token = header.slice(tokenStart, i);
    skipSpaces();

    if (header[i] !== "=") {
      if (token) challenges.push({ scheme: token.toLowerCase(), params: {} });
      else i++;
      continue;
    }

    i++;
    skipSpaces();

    let value = "";
    if (header[i] === '"') {
      i++;
      while (i < length && header[i] !== '"') {
        if (header[i] === "\\" && i + 1 < length) i++;
        value += header[i];
        i++;
      }
      i++;
    } else {
      const valueStart = i;
      while (i < length && !isSpace(header[i]) && header[i] !== ",") i++;
      value = header.slice(valueStart, i);
    }

    const current = challenges[challenges.length - 1];
    if (current && token) current.params[token.toLowerCase()] = value;
  }

  return challenges;
};

export const parseWwwAuthenticate = (
  header: string | null | undefined,
): BearerChallenge | null => {
  if (!header) return null;
  const bearer = parseChallenges(header).find((c) => c.scheme === "bearer");
  if (!bearer) return null;

  const { params } = bearer;
  return {
    resourceMetadata: params["resource_metadata"],
    scope: params["scope"],
    error: params["error"],
    errorDescription: params["error_description"],
    realm: params["realm"],
  };
};

const buildWellKnownUrl = (base: string, suffix: string): string => {
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

const fetchAuthorizationServerMetadata = async (
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

  if (!resourceUrl) {
    throw new AgentAuthError(
      "missing_resource_url",
      "resourceUrl is required to validate protected resource metadata",
    );
  }

  const challengeMetadataUrl = challenge?.resourceMetadata;
  const candidates = challengeMetadataUrl
    ? [challengeMetadataUrl]
    : [
        buildWellKnownUrl(resourceUrl, "oauth-protected-resource"),
        `${new URL(resourceUrl).origin}/.well-known/oauth-protected-resource`,
      ].filter((value, index, all) => all.indexOf(value) === index);

  let metadataUrl = candidates[0];
  let resourceMetadata: ProtectedResourceMetadata | undefined;
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      resourceMetadata = await fetchProtectedResourceMetadata(
        candidate,
        options,
      );
      metadataUrl = candidate;
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!resourceMetadata) {
    throw lastError;
  }

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
