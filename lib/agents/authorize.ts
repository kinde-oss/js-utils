import { AgentAuthError } from "./errors";
import { assertNoOpenId, assertSecureUrl, normalizeScope } from "./http";
import { generatePkcePair, generateState } from "./pkce";
import type {
  AuthorizationRequest,
  AuthorizationServerMetadata,
} from "./types";

export interface BuildAuthorizationUrlOptions {
  authorizationServer: Pick<
    AuthorizationServerMetadata,
    "authorization_endpoint" | "code_challenge_methods_supported"
  >;
  clientId: string;
  redirectUri: string;
  scope?: string | string[];
  resource?: string;
  state?: string;
}

export const buildAuthorizationUrl = async (
  options: BuildAuthorizationUrlOptions,
): Promise<AuthorizationRequest> => {
  const { authorizationServer, clientId, redirectUri, resource } = options;

  const supportedMethods = authorizationServer.code_challenge_methods_supported;
  if (!supportedMethods?.includes("S256")) {
    throw new AgentAuthError(
      "pkce_unsupported",
      "Authorization server does not support S256 PKCE",
    );
  }

  const scopes = normalizeScope(options.scope);
  assertNoOpenId(scopes);

  const url = assertSecureUrl(
    authorizationServer.authorization_endpoint,
    "authorization_endpoint",
  );
  const { codeVerifier, codeChallenge } = await generatePkcePair();
  const state = options.state ?? generateState();

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (scopes.length) url.searchParams.set("scope", scopes.join(" "));
  if (resource) url.searchParams.set("resource", resource);

  return { url, state, codeVerifier, codeChallenge };
};
