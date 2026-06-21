import { storageSettings } from "../sessionManager/index.js";

export interface CookieOptions {
  maxAge?: number;
  domain?: string;
  maxCookieLength?: number;
  sameSite?: string;
  httpOnly?: boolean;
  secure?: boolean;
  path?: string;
}

export const TWENTY_NINE_DAYS = 2505600;

/**
 * Default cookie options used across Kinde SDKs.
 *
 * **Security Note:** The `secure` flag is intentionally omitted to support:
 * - Framework-agnostic usage across different environments
 * - Local development over HTTP (localhost)
 *
 * Warning: For production deployments using HTTPS, consumers must explicitly
 * set `secure: true` via `getCookieOptions({ secure: true })` to ensure
 * cookies are only transmitted over secure connections.
 */
export const GLOBAL_COOKIE_OPTIONS: CookieOptions = {
  maxAge: TWENTY_NINE_DAYS,
  maxCookieLength: storageSettings.maxLength,
  sameSite: "lax",
  httpOnly: true,
  path: "/",
};

/**
 * Returns cookie options by merging provided options with secure defaults.
 *
 * @param options - Custom cookie options to override defaults
 * @returns Merged cookie options with GLOBAL_COOKIE_OPTIONS as base
 *
 * @example
 * ```typescript
 * // Development (HTTP)
 * const devOptions = getCookieOptions();
 *
 * // Production (HTTPS) - must set secure: true
 * const prodOptions = getCookieOptions({ secure: true, domain: ".example.com" });
 * ```
 *
 * **Security Warning:** Always set `secure: true` in production environments
 * using HTTPS to prevent cookie transmission over insecure connections.
 */
export const getCookieOptions = (
  options: CookieOptions = {},
): CookieOptions => {
  return {
    ...GLOBAL_COOKIE_OPTIONS,
    ...options,
  };
};
