import { AgentAuthError } from "../errors";
import { buildWellKnownUrl, stripTrailingSlash } from "../discovery";
import { assertSecureUrl, normalizeScope, stripOpenId } from "../http";
import type { FetchOptions } from "../types";

export type TokenVerification = "introspection" | "local";

export interface ResourceServerOptions extends FetchOptions {
  issuer: string;
  resource: string;
  clientId?: string;
  clientSecret?: string;
  scopes?: string | string[];
  audience?: string | string[];
  verification?: TokenVerification;
}

export interface ResourceServerConfig extends FetchOptions {
  issuer: string;
  resource: string;
  scopes: string[];
  audience: string[];
  verification: TokenVerification;
  clientId?: string;
  clientSecret?: string;
  resourceMetadataUrl: string;
  resourceMetadataPath: string;
  authorizationServerMirrorPath: string;
  introspectionEndpoint: string;
  revocationEndpoint: string;
  jwksUri: string;
}

export const createResourceServerConfig = (
  options: ResourceServerOptions,
): ResourceServerConfig => {
  const issuer = stripTrailingSlash(
    assertSecureUrl(options.issuer, "issuer").href,
  );
  const resource = stripTrailingSlash(
    assertSecureUrl(options.resource, "resource").href,
  );
  const verification = options.verification ?? "introspection";

  if (
    verification === "introspection" &&
    !(options.clientId && options.clientSecret)
  ) {
    throw new AgentAuthError(
      "missing_client_credentials",
      "clientId and clientSecret are required for introspection",
    );
  }

  const resourceMetadataUrl = buildWellKnownUrl(
    resource,
    "oauth-protected-resource",
  );
  const audience = normalizeScope(options.audience);

  return {
    issuer,
    resource,
    scopes: stripOpenId(normalizeScope(options.scopes)),
    audience: audience.length ? audience : [options.resource],
    verification,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    fetch: options.fetch,
    resourceMetadataUrl,
    resourceMetadataPath: new URL(resourceMetadataUrl).pathname,
    authorizationServerMirrorPath: "/.well-known/oauth-authorization-server",
    introspectionEndpoint: `${issuer}/oauth2/introspect`,
    revocationEndpoint: `${issuer}/oauth2/revoke`,
    jwksUri: `${issuer}/.well-known/jwks`,
  };
};
