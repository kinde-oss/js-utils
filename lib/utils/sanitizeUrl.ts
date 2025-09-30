/**
 * Sanitizes a URL string by normalizing multiple consecutive slashes and removing trailing slashes.
 *
 * This function:
 * - Replaces multiple consecutive slashes with single slashes (except for protocol's ://)
 * - Preserves protocol-relative URLs (//domain.com) for deep linking
 * - Removes trailing slashes from the end of the URL
 * - Preserves a single slash if that's all that remains
 *
 * @param url - The URL string to sanitize
 * @returns The sanitized URL string
 *
 * @example
 * ```typescript
 * sanitizeUrl("https://example.com/")
 * // Returns: "https://example.com"
 *
 * sanitizeUrl("https://example.com//api///v1//")
 * // Returns: "https://example.com/api/v1"
 *
 * sanitizeUrl("//example.com//deep//link//")
 * // Returns: "//example.com/deep/link"
 *
 * sanitizeUrl("///api//v1//users//")
 * // Returns: "/api/v1/users"
 * ```
 */
export const sanitizeUrl = (url: string): string => {
  let result = url.replace(/([^:]\/)\/+/g, "$1"); // Replace multiple consecutive slashes with single slash, but preserve protocol's ://

  // Handle multiple slashes at the beginning
  if (result.match(/^\/\/[^/?]+/) && result.includes(".")) {
    // This looks like a protocol-relative URL (//domain.com), keep it as is
    result = result.replace(/^\/\/\/+/, "//");
  } else if (result.match(/^\/\/+/)) {
    // This is not a protocol-relative URL, normalize to single slash
    result = result.replace(/^\/\/+/, "/");
  }

  // Only remove trailing slash if the result is not just a single slash
  if (result !== "/") {
    result = result.replace(/\/$/, "");
  }

  return result;
};
