import { getDecodedToken, getDecodedTokenSync } from "../token";
import type { AcrValue } from "./params";
import { formatMaxAge, highestAcr } from "./params";

export type AuthenticationContext = {
  /** `null` when the token has no `acr` (a single-factor sign-in). */
  acr: AcrValue | null;
  /** Methods used. Empty when the token has no `amr`. Informational only. */
  amr: string[];
  /** Seconds since the epoch. From the ID token when one is present. */
  authTime: number | null;
};

export type AuthenticationContextRequirement = {
  acr?: AcrValue;
  maxAge?: number;
};

type AuthenticationClaims = {
  acr?: unknown;
  amr?: unknown;
  auth_time?: unknown;
};

const ACR_RANK: Record<AcrValue, number> = {
  mfa: 1,
  phr: 2,
};

const normalizeAcr = (value: unknown): AcrValue | null => {
  if (typeof value !== "string") {
    return null;
  }
  return highestAcr(value);
};

const normalizeAmr = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
};

const normalizeAuthTime = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
};

/**
 * Reads `acr`, `amr`, and `auth_time` from decoded tokens.
 * `auth_time` comes from the ID token when the SDK has one, otherwise the access token.
 */
export const readAuthenticationContext = (tokens: {
  idToken?: AuthenticationClaims | null;
  accessToken?: AuthenticationClaims | null;
}): AuthenticationContext | null => {
  const idToken = tokens.idToken ?? null;
  const accessToken = tokens.accessToken ?? null;
  if (!idToken && !accessToken) {
    return null;
  }

  const claims = idToken ?? accessToken;
  const authTimeSource = idToken ?? accessToken;
  return {
    acr: normalizeAcr(claims?.acr),
    amr: normalizeAmr(claims?.amr),
    authTime: normalizeAuthTime(authTimeSource?.auth_time),
  };
};

/**
 * Authentication context of the current session.
 * `authTime` is returned as stored on the token. On an issuer that does not
 * advertise `acr_values_supported`, that value may be the token issue time
 * and must not be used for recency. Check `isStepUpSupported` first.
 */
export const getAuthenticationContext =
  async (): Promise<AuthenticationContext | null> => {
    const idToken = await getDecodedToken<AuthenticationClaims>("idToken");
    const accessToken =
      await getDecodedToken<AuthenticationClaims>("accessToken");
    return readAuthenticationContext({ idToken, accessToken });
  };

export const getAuthenticationContextSync =
  (): AuthenticationContext | null => {
    const idToken = getDecodedTokenSync<AuthenticationClaims>("idToken");
    const accessToken =
      getDecodedTokenSync<AuthenticationClaims>("accessToken");
    return readAuthenticationContext({ idToken, accessToken });
  };

const meets = (
  ctx: AuthenticationContext,
  requirement: AuthenticationContextRequirement,
  now: number,
): boolean => {
  if (requirement.acr !== undefined) {
    const required = highestAcr(requirement.acr);
    if (!required) {
      throw new Error(
        `acr must be "mfa" or "phr". Received ${String(requirement.acr)}.`,
      );
    }
    const currentRank =
      ctx.acr === "mfa" || ctx.acr === "phr" ? ACR_RANK[ctx.acr] : 0;
    if (currentRank < ACR_RANK[required]) {
      return false;
    }
  }

  if (requirement.maxAge !== undefined && requirement.maxAge !== null) {
    formatMaxAge(requirement.maxAge);
    if (ctx.authTime === null) {
      return false;
    }
    if (now - ctx.authTime > requirement.maxAge) {
      return false;
    }
  }

  return true;
};

const isAuthenticationContext = (
  value: AuthenticationContext | AuthenticationContextRequirement,
): value is AuthenticationContext => "authTime" in value || "amr" in value;

/**
 * Whether `ctx` meets `requirement`.
 * Ordering is none < mfa < phr. `phr` meets an `mfa` requirement.
 * `amr` is never consulted. A missing `authTime` fails a `maxAge` check.
 *
 * Pass a requirement alone to read the current session.
 */
export function hasAuthenticationContext(
  ctx: AuthenticationContext,
  requirement: AuthenticationContextRequirement,
  now?: number,
): boolean;
export function hasAuthenticationContext(
  requirement: AuthenticationContextRequirement,
): Promise<boolean>;
export function hasAuthenticationContext(
  ctxOrRequirement: AuthenticationContext | AuthenticationContextRequirement,
  requirement?: AuthenticationContextRequirement,
  now: number = Math.floor(Date.now() / 1000),
): boolean | Promise<boolean> {
  if (requirement !== undefined) {
    return meets(ctxOrRequirement as AuthenticationContext, requirement, now);
  }

  if (isAuthenticationContext(ctxOrRequirement)) {
    throw new Error(
      "hasAuthenticationContext(ctx, requirement) needs both the context and the requirement.",
    );
  }

  return getAuthenticationContext().then((ctx) => {
    if (!ctx) {
      return false;
    }
    return meets(ctx, ctxOrRequirement, now);
  });
}
