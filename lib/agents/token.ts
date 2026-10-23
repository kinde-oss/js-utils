import { AgentAuthError } from "./errors";
import {
  assertSecureUrl,
  readJson,
  resolveFetch,
  postForm,
  toOAuthError,
} from "./http";
import type { FetchOptions, TokenSet } from "./types";

interface ClientAuth {
  clientId: string;
  clientSecret?: string;
}

interface TokenResponseBody {
  access_token?: string;
  token_type?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

const parseTokenResponse = async (
  response: Response,
  label: string,
  fallbackRefreshToken?: string,
): Promise<TokenSet> => {
  if (!response.ok) {
    throw await toOAuthError(response, label);
  }
  const data = await readJson<TokenResponseBody>(response, label);
  if (!data?.access_token) {
    throw new AgentAuthError(
      "invalid_response",
      `${label} response is missing access_token`,
    );
  }
  const expiresIn =
    typeof data.expires_in === "number" ? data.expires_in : undefined;
  const refreshToken = data.refresh_token ?? fallbackRefreshToken;

  return {
    accessToken: data.access_token,
    tokenType: data.token_type ?? "Bearer",
    ...(refreshToken && { refreshToken }),
    ...(expiresIn !== undefined && {
      expiresIn,
      expiresAt: Date.now() + expiresIn * 1000,
    }),
    ...(data.scope && { scope: data.scope }),
  };
};

export interface ExchangeCodeOptions extends ClientAuth, FetchOptions {
  tokenEndpoint: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  resource?: string;
}

export const exchangeCode = async (
  options: ExchangeCodeOptions,
): Promise<TokenSet> => {
  assertSecureUrl(options.tokenEndpoint, "token_endpoint");
  const response = await postForm(
    resolveFetch(options.fetch),
    options.tokenEndpoint,
    {
      grant_type: "authorization_code",
      client_id: options.clientId,
      client_secret: options.clientSecret,
      code: options.code,
      code_verifier: options.codeVerifier,
      redirect_uri: options.redirectUri,
      resource: options.resource,
    },
  );
  return parseTokenResponse(response, "Token exchange");
};

export interface RefreshAccessTokenOptions extends ClientAuth, FetchOptions {
  tokenEndpoint: string;
  refreshToken: string;
  scope?: string;
  resource?: string;
}

export const refreshAccessToken = async (
  options: RefreshAccessTokenOptions,
): Promise<TokenSet> => {
  assertSecureUrl(options.tokenEndpoint, "token_endpoint");
  const response = await postForm(
    resolveFetch(options.fetch),
    options.tokenEndpoint,
    {
      grant_type: "refresh_token",
      client_id: options.clientId,
      client_secret: options.clientSecret,
      refresh_token: options.refreshToken,
      scope: options.scope,
      resource: options.resource,
    },
  );
  return parseTokenResponse(response, "Token refresh", options.refreshToken);
};

export interface RevokeTokenOptions extends ClientAuth, FetchOptions {
  revocationEndpoint?: string;
  token: string;
  tokenTypeHint?: "access_token" | "refresh_token";
}

export const revokeToken = async (
  options: RevokeTokenOptions,
): Promise<void> => {
  if (!options.revocationEndpoint) {
    throw new AgentAuthError(
      "no_revocation_endpoint",
      "Authorization server does not advertise a revocation endpoint",
    );
  }
  assertSecureUrl(options.revocationEndpoint, "revocation_endpoint");
  const response = await postForm(
    resolveFetch(options.fetch),
    options.revocationEndpoint,
    {
      token: options.token,
      token_type_hint: options.tokenTypeHint,
      client_id: options.clientId,
      client_secret: options.clientSecret,
    },
  );
  if (!response.ok) {
    throw await toOAuthError(response, "Token revocation");
  }
};
