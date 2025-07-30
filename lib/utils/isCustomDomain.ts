/**
 * Checks if a domain is a custom domain (not a Kinde.com domain).
 *
 * This function determines whether the provided domain is a custom domain
 * by checking if it matches the pattern for Kinde.com domains. A domain
 * is considered custom if it does NOT match the Kinde.com pattern.
 *
 * The function accepts domains with or without protocol (http/https) and
 * checks against the pattern: `*.kinde.com` (case insensitive).
 *
 * @param domain - The domain string to check (can include protocol)
 * @returns True if the domain is a custom domain, false if it's a Kinde.com domain
 *
 * @example
 * ```typescript
 * isCustomDomain("https://app.kinde.com")
 * // Returns: false
 *
 * isCustomDomain("app.kinde.com")
 * // Returns: false
 *
 * isCustomDomain("https://myapp.com")
 * // Returns: true
 *
 * isCustomDomain("myapp.com")
 * // Returns: true
 *
 * isCustomDomain("https://auth.mycompany.com")
 * // Returns: true
 *
 * isCustomDomain("https://subdomain.kinde.com")
 * // Returns: false
 * ```
 */
export const isCustomDomain = (domain: string): boolean => {
  return !domain.match(
    /^(?:https?:\/\/)?[a-zA-Z0-9][.-a-zA-Z0-9]*\.kinde\.com$/i,
  );
};
