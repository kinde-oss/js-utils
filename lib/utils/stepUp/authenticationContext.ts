import { getDecodedToken, getDecodedTokenSync } from "../token";
import { cachedStepUpSupported, isStepUpSupported } from "./discovery";
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
  iss?: unknown;
};

const ACR_RANK: Record<AcrValue, number> = {
  mfa: 1,
  phr: 2,
};

/** `acr` claim as `mfa`, `phr`, or null when absent or unrecognised. */
const normalizeAcr = (value: unknown): AcrValue | null => {
  if (typeof value !== "string") {
    return null;
  }
  return highestAcr(value);
};

/** `amr` claim as a list of strings; empty when absent. */
const normalizeAmr = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
};

/** `auth_time` claim in seconds, or null when it is not a finite number. */
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

/** Issuer claim from the ID token when it has one, otherwise the access token. */
const issuerFrom = (
  idToken: AuthenticationClaims | null,
  accessToken: AuthenticationClaims | null,
): string | null => {
  const issuer = idToken?.iss ?? accessToken?.iss;
  return typeof issuer === "string" && issuer !== "" ? issuer : null;
};

/**
 * Drops `authTime` when discovery says step-up is unsupported.
 * `undefined` means the issuer has not been checked, so the token value stays.
 */
const applyStepUpSupport = (
  ctx: AuthenticationContext | null,
  supported: boolean | undefined,
): AuthenticationContext | null => {
  if (!ctx || supported !== false) {
    return ctx;
  }
  return { ...ctx, authTime: null };
};

/**
 * Authentication context of the current session.
 * `authTime` comes from the ID token when one exists, otherwise the access token.
 * The issuer is read the same way. When `acr_values_supported` is absent,
 * `authTime` is `null` because that claim may be the token issue time.
 */
export const getAuthenticationContext =
  async (): Promise<AuthenticationContext | null> => {
    const idToken = await getDecodedToken<AuthenticationClaims>("idToken");
    const accessToken =
      await getDecodedToken<AuthenticationClaims>("accessToken");
    const ctx = readAuthenticationContext({ idToken, accessToken });
    const issuer = issuerFrom(idToken, accessToken);
    if (!ctx || !issuer) {
      return ctx;
    }
    return applyStepUpSupport(ctx, await isStepUpSupported(issuer));
  };

/**
 * Synchronous `getAuthenticationContext`. Throws when the active storage is async-only.
 * Uses the cached discovery document. Until that cache exists, `authTime` is the token value.
 */
export const getAuthenticationContextSync =
  (): AuthenticationContext | null => {
    const idToken = getDecodedTokenSync<AuthenticationClaims>("idToken");
    const accessToken =
      getDecodedTokenSync<AuthenticationClaims>("accessToken");
    const ctx = readAuthenticationContext({ idToken, accessToken });
    const issuer = issuerFrom(idToken, accessToken);
    if (!ctx || !issuer) {
      return ctx;
    }
    return applyStepUpSupport(ctx, cachedStepUpSupported(issuer));
  };

/**
 * Whether `ctx` meets `requirement` at `now` (seconds).
 * A missing or future `authTime` fails a `maxAge` check.
 */
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

  const maxAge = formatMaxAge(requirement.maxAge);
  if (maxAge !== undefined) {
    if (ctx.authTime === null || ctx.authTime > now) {
      return false;
    }
    if (now - ctx.authTime > Number(maxAge)) {
      return false;
    }
  }

  return true;
};

/** Distinguishes a context from a requirement when only one argument is passed. */
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
  now?: number,
): boolean | Promise<boolean> {
  if (requirement !== undefined) {
    return meets(
      ctxOrRequirement as AuthenticationContext,
      requirement,
      now ?? Math.floor(Date.now() / 1000),
    );
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

    // Default to the clock after the session read, preserving an explicit now.
    return meets(ctx, ctxOrRequirement, now ?? Math.floor(Date.now() / 1000));
  });
}
