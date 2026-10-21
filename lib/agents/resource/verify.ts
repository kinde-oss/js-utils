import { stripTrailingSlash } from "../discovery";
import { AgentAuthError } from "../errors";
import {
  fetchJson,
  normalizeScope,
  postForm,
  readJson,
  resolveFetch,
  toOAuthError,
} from "../http";
import { base64UrlDecode } from "../../utils/base64UrlEncode";
import type { ResourceServerConfig } from "./config";
import { createUnauthorizedResponse } from "./routes";

export interface VerifiedToken {
  token: string;
  claims: Record<string, unknown>;
  subject?: string;
  clientId?: string;
  scopes: string[];
  permissions: string[];
  expiresAt?: number;
}

export type AuthenticationResult =
  { ok: true; auth: VerifiedToken } | { ok: false; response: Response };

type SigningKey = JsonWebKey & { kid?: string };

const JWKS_TTL_MS = 10 * 60 * 1000;
const JWKS_REFETCH_COOLDOWN_MS = 60 * 1000;

const jwksCache = new WeakMap<
  ResourceServerConfig,
  { keys: SigningKey[]; fetchedAt: number }
>();

const invalidToken = (description: string): AgentAuthError =>
  new AgentAuthError("invalid_token", description, 401);

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const decodeBase64UrlBytes = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "="),
  );
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const parseJson = (segment: string): Record<string, unknown> => {
  let value: unknown;
  try {
    value = JSON.parse(base64UrlDecode(segment));
  } catch {
    value = undefined;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw invalidToken("Malformed token");
};

const validateClaims = (
  claims: Record<string, unknown>,
  config: ResourceServerConfig,
  strict: boolean,
): void => {
  const now = Math.floor(Date.now() / 1000);
  const { exp, nbf, iss, aud } = claims;

  if (typeof exp === "number" ? exp <= now : strict) {
    throw invalidToken("Token is expired or has no expiry");
  }
  if (typeof nbf === "number" && nbf > now) {
    throw invalidToken("Token is not yet valid");
  }
  if (
    typeof iss === "string" ? stripTrailingSlash(iss) !== config.issuer : strict
  ) {
    throw invalidToken("Token issuer does not match");
  }
  const audiences = typeof aud === "string" ? [aud] : toStringArray(aud);
  if (!config.audience.some((expected) => audiences.includes(expected))) {
    throw invalidToken("Token audience does not match this resource");
  }
};

const findSigningKey = async (
  config: ResourceServerConfig,
  kid: unknown,
): Promise<SigningKey | undefined> => {
  const cached = jwksCache.get(config);
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  const hit =
    cached && age < JWKS_TTL_MS
      ? cached.keys.find((key) => key.kid === kid)
      : undefined;
  if (hit || age < JWKS_REFETCH_COOLDOWN_MS) return hit;

  const { keys } = await fetchJson<{ keys: SigningKey[] }>(
    resolveFetch(config.fetch),
    config.jwksUri,
    "JWKS request",
  );
  jwksCache.set(config, { keys, fetchedAt: Date.now() });
  return keys.find((key) => key.kid === kid);
};

const verifyLocally = async (
  token: string,
  config: ResourceServerConfig,
): Promise<Record<string, unknown>> => {
  const parts = token.split(".");
  if (parts.length !== 3) throw invalidToken("Malformed token");

  const header = parseJson(parts[0]);
  if (header.alg !== "RS256") {
    throw invalidToken("Unsupported signing algorithm");
  }
  if (!globalThis.crypto?.subtle) {
    throw new AgentAuthError(
      "crypto_unavailable",
      "crypto.subtle is required for local token verification",
    );
  }

  const jwk = await findSigningKey(config, header.kid);
  if (!jwk) throw invalidToken("Unknown signing key");

  const key = await globalThis.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await globalThis.crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64UrlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw invalidToken("Invalid token signature");

  const claims = parseJson(parts[1]);
  validateClaims(claims, config, true);
  return claims;
};

const introspect = async (
  token: string,
  config: ResourceServerConfig,
): Promise<Record<string, unknown>> => {
  const response = await postForm(
    resolveFetch(config.fetch),
    config.introspectionEndpoint,
    {
      token,
      token_type_hint: "access_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    },
  );
  if (!response.ok) throw await toOAuthError(response, "Token introspection");

  const { active, ...claims } = await readJson<
    Record<string, unknown> & { active?: boolean }
  >(response, "Token introspection");
  if (active !== true) throw invalidToken("Token is not active");

  validateClaims(claims, config, false);
  return claims;
};

export const verifyAccessToken = async (
  token: string,
  config: ResourceServerConfig,
): Promise<VerifiedToken> => {
  const claims =
    config.verification === "local"
      ? await verifyLocally(token, config)
      : await introspect(token, config);

  const scopes =
    typeof claims.scope === "string"
      ? normalizeScope(claims.scope)
      : toStringArray(claims.scp);
  const { sub, client_id, azp, exp } = claims;
  const clientId = client_id ?? azp;

  return {
    token,
    claims,
    scopes,
    permissions: toStringArray(claims.permissions),
    ...(typeof sub === "string" && { subject: sub }),
    ...(typeof clientId === "string" && { clientId }),
    ...(typeof exp === "number" && { expiresAt: exp }),
  };
};

const extractBearerToken = (request: Request): string | null =>
  request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;

export const authenticateRequest = async (
  request: Request,
  config: ResourceServerConfig,
): Promise<AuthenticationResult> => {
  const token = extractBearerToken(request);
  if (!token) {
    return { ok: false, response: createUnauthorizedResponse(config) };
  }
  try {
    return { ok: true, auth: await verifyAccessToken(token, config) };
  } catch (error) {
    if (error instanceof AgentAuthError && error.code === "invalid_token") {
      return {
        ok: false,
        response: createUnauthorizedResponse(config, {
          error: "invalid_token",
          errorDescription: error.description,
        }),
      };
    }
    throw error;
  }
};

export const hasPermission = (
  auth: Pick<VerifiedToken, "permissions">,
  permission: string,
): boolean => auth.permissions.includes(permission);
