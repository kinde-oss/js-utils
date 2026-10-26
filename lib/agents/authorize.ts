import { AgentAuthError } from "./errors";
import {
  assertNoOpenId,
  assertSecureUrl,
  normalizeScope,
  parseUrl,
} from "./http";
import { generatePkcePair, generateState } from "./pkce";
import type {
  AuthorizationRequest,
  AuthorizationServerMetadata,
  CryptoAdapter,
} from "./types";

export interface BuildAuthorizationUrlOptions {
  authorizationServer: Pick<
    AuthorizationServerMetadata,
    "authorization_endpoint" | "code_challenge_methods_supported"
  >;
  clientId: string;
  redirectUri: string;
  scope?: string | string[];
  resource: string;
  state?: string;
  crypto?: CryptoAdapter;
}

export const buildAuthorizationUrl = async (
  options: BuildAuthorizationUrlOptions,
): Promise<AuthorizationRequest> => {
  const { authorizationServer, clientId, redirectUri, resource } = options;

  const supportedMethods = authorizationServer.code_challenge_methods_supported;
  if (!supportedMethods?.includes("S256")) {
    throw new AgentAuthError(
      "pkce_unsupported",
      "Authorization server does not advertise S256 PKCE support",
    );
  }

  const scopes = normalizeScope(options.scope);
  assertNoOpenId(scopes);

  const url = assertSecureUrl(
    authorizationServer.authorization_endpoint,
    "authorization_endpoint",
  );
  const { codeVerifier, codeChallenge } = await generatePkcePair(
    options.crypto,
  );
  const state = options.state ?? generateState(options.crypto);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (scopes.length) url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("resource", resource);
  url.searchParams.delete("nonce");
  assertNoOpenId(normalizeScope(url.searchParams.get("scope") ?? undefined));

  return { url, state, codeVerifier, codeChallenge };
};

export interface ValidateAuthorizationResponseOptions {
  callbackUrl: string | URL;
  expectedState: string;
  authorizationServer: Pick<
    AuthorizationServerMetadata,
    "issuer" | "authorization_response_iss_parameter_supported"
  >;
}

export const validateAuthorizationResponse = (
  options: ValidateAuthorizationResponseOptions,
): { code: string } => {
  const callbackUrl =
    typeof options.callbackUrl === "string"
      ? parseUrl(options.callbackUrl, "callbackUrl")
      : options.callbackUrl;
  const params = callbackUrl.searchParams;
  const { issuer, authorization_response_iss_parameter_supported } =
    options.authorizationServer;

  if (params.get("state") !== options.expectedState) {
    throw new AgentAuthError("state_mismatch", "state does not match");
  }

  const iss = params.get("iss");
  if (iss !== null || authorization_response_iss_parameter_supported) {
    if (iss !== issuer) {
      throw new AgentAuthError("issuer_mismatch", "iss does not match");
    }
  }

  const error = params.get("error");
  if (error) {
    throw new AgentAuthError(
      error,
      params.get("error_description") ?? undefined,
    );
  }

  const code = params.get("code");
  if (!code) throw new AgentAuthError("invalid_response", "Missing code");

  return { code };
};
