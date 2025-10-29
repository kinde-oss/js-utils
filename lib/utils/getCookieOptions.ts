export interface CookieEnv {
  NODE_ENV?: string;
  KINDE_COOKIE_DOMAIN?: string;
  [key: string]: string | undefined;
}

export type CookieOptionValue = string | number | boolean | undefined | null;

export interface CookieOptions {
  maxAge?: number;
  domain?: string;
  maxCookieLength?: number;
  sameSite?: string;
  httpOnly?: boolean;
  secure?: boolean;
  path?: string;
  [key: string]: CookieOptionValue;
}

export const TWENTY_NINE_DAYS = 2505600;
export const MAX_COOKIE_LENGTH = 3000;

export const GLOBAL_COOKIE_OPTIONS: CookieOptions = {
  sameSite: "lax",
  httpOnly: true,
  path: "/",
};

const getRuntimeEnv = (): CookieEnv => {
  // In browser/react-native bundles process is undefined
  if (typeof globalThis === "undefined") {
    return {};
  }

  const maybeProcess = (globalThis as { process?: { env?: CookieEnv } })
    .process;
  return maybeProcess?.env ?? {};
};

export function removeTrailingSlash(
  url: string | undefined | null,
): string | undefined {
  if (url === undefined || url === null) return undefined;

  url = url.trim();
  if (url.length === 0) {
    return undefined;
  }

  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }

  return url;
}

export const getCookieOptions = (
  options: CookieOptions = {},
  env?: CookieEnv,
): CookieOptions => {
  const resolvedEnv = env ?? getRuntimeEnv();
  const rawDomain = resolvedEnv.KINDE_COOKIE_DOMAIN;
  const domainFromEnv = removeTrailingSlash(rawDomain);
  const secureDefault = resolvedEnv.NODE_ENV === "production";

  if (
    rawDomain &&
    domainFromEnv === undefined &&
    options.domain === undefined
  ) {
    console.warn(
      "getCookieOptions: KINDE_COOKIE_DOMAIN is empty after trimming and will be ignored.",
    );
  }

  const merged: CookieOptions = {
    maxAge: TWENTY_NINE_DAYS,
    domain: domainFromEnv,
    maxCookieLength: MAX_COOKIE_LENGTH,
    ...GLOBAL_COOKIE_OPTIONS,
    ...options,
  };

  if (options.secure === undefined) {
    merged.secure = secureDefault;
    if (resolvedEnv.NODE_ENV === undefined) {
      console.warn(
        "getCookieOptions: NODE_ENV not set; defaulting secure cookie flag to false. Provide env or override secure to suppress this warning.",
      );
    }
  }

  return merged;
};
