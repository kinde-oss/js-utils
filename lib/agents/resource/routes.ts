import { fetchAuthorizationServerMetadata } from "../discovery";
import { AgentAuthError } from "../errors";
import type {
  AuthorizationServerMetadata,
  ProtectedResourceMetadata,
} from "../types";
import type { ResourceServerConfig } from "./config";

const METADATA_MAX_AGE_SECONDS = 3600;
const METADATA_CACHE_CONTROL = `public, max-age=${METADATA_MAX_AGE_SECONDS}`;

const jsonResponse = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

export const createProtectedResourceMetadataHandler = (
  config: ResourceServerConfig,
): (() => Response) => {
  const metadata: ProtectedResourceMetadata = {
    resource: config.resource,
    authorization_servers: [config.issuer],
    bearer_methods_supported: ["header"],
    ...(config.scopes.length && { scopes_supported: config.scopes }),
  };
  return () =>
    jsonResponse(metadata, 200, { "Cache-Control": METADATA_CACHE_CONTROL });
};

export const createAuthorizationServerMirrorHandler = (
  config: ResourceServerConfig,
): (() => Promise<Response>) => {
  let cached:
    | { metadata: Promise<AuthorizationServerMetadata>; expiresAt: number }
    | undefined;

  return async () => {
    let entry = cached;
    if (!entry || entry.expiresAt <= Date.now()) {
      const created = {
        metadata: fetchAuthorizationServerMetadata(config.issuer, {
          fetch: config.fetch,
        }),
        expiresAt: Date.now() + METADATA_MAX_AGE_SECONDS * 1000,
      };
      created.metadata.catch(() => {
        if (cached === created) cached = undefined;
      });
      cached = entry = created;
    }

    try {
      return jsonResponse(await entry.metadata, 200, {
        "Cache-Control": METADATA_CACHE_CONTROL,
      });
    } catch (error) {
      return jsonResponse(
        {
          error: "server_error",
          error_description:
            error instanceof AgentAuthError ? error.code : "unavailable",
        },
        502,
      );
    }
  };
};

export interface UnauthorizedOptions {
  error?: string;
  errorDescription?: string;
  scope?: string | string[];
}

const quote = (value: string): string =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const buildWwwAuthenticate = (
  config: ResourceServerConfig,
  options: UnauthorizedOptions = {},
): string => {
  const scope = (
    Array.isArray(options.scope)
      ? options.scope.join(" ")
      : (options.scope ?? "")
  ).trim();
  const params = [
    ...(options.error ? [`error=${quote(options.error)}`] : []),
    ...(options.errorDescription
      ? [`error_description=${quote(options.errorDescription)}`]
      : []),
    ...(scope ? [`scope=${quote(scope)}`] : []),
    `resource_metadata=${quote(config.resourceMetadataUrl)}`,
  ];
  return `Bearer ${params.join(", ")}`;
};

export const createUnauthorizedResponse = (
  config: ResourceServerConfig,
  options: UnauthorizedOptions = {},
): Response =>
  jsonResponse(
    {
      error: options.error ?? "unauthorized",
      ...(options.errorDescription && {
        error_description: options.errorDescription,
      }),
    },
    options.error === "insufficient_scope" ? 403 : 401,
    {
      "WWW-Authenticate": buildWwwAuthenticate(config, options),
      "Cache-Control": "no-store",
    },
  );
