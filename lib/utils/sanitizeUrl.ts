/**
 * Removes trailing slashes from a URL string.
 *
 * This function uses a regular expression to remove any trailing forward slash
 * from the end of a URL string. It only removes the slash if it's at the very
 * end of the string, preserving any other slashes within the URL.
 *
 * @param url - The URL string to sanitize
 * @returns The URL string with trailing slash removed, or the original string if no trailing slash exists
 *
 * @example
 * ```typescript
 * sanitizeUrl("https://example.com/")
 * // Returns: "https://example.com"
 *
 * sanitizeUrl("https://example.com/api/v1/")
 * // Returns: "https://example.com/api/v1"
 *
 * sanitizeUrl("https://example.com")
 * // Returns: "https://example.com" (no change)
 *
 * sanitizeUrl("https://example.com/path/to/resource/")
 * // Returns: "https://example.com/path/to/resource"
 * ```
 */
export const sanitizeUrl = (url: string): string => {
  return url.replace(/\/$/, "");
};
