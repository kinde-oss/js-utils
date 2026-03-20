/**
 * Encodes the provided ArrayBuffer or string to base64url format (RFC 4648 §5).
 * Safe for use in URLs: uses - and _ instead of + and /, and omits padding.
 * Use this when the result will appear in query params or path segments (e.g. PKCE code_challenge).
 *
 * @param input String or ArrayBuffer to encode
 * @returns base64url-encoded string (no +, /, or trailing =)
 */
export const base64UrlEncode = (input: string | ArrayBuffer): string => {
  const toBase64Url = (str: string): string =>
    btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // More robust check for ArrayBuffer
  const isArrayBuffer =
    input instanceof ArrayBuffer ||
    Object.prototype.toString.call(input) === "[object ArrayBuffer]";

  if (isArrayBuffer) {
    const uint8Array = new Uint8Array(input as ArrayBuffer);
    const binaryString = String.fromCharCode(...uint8Array);
    return toBase64Url(binaryString);
  }

  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(input as string);
  const binaryString = String.fromCharCode(...uint8Array);
  return toBase64Url(binaryString);
};

/**
 * Decodes a base64url string (RFC 4648 §5) to a UTF-8 string.
 * Use this when decoding values that may have been encoded as base64url for URLs
 * (e.g. OAuth state in callback URLs). Standard atob() will throw on base64url
 * because it uses - and _ and omits padding.
 *
 * @param base64url - base64url-encoded string (e.g. from a callback URL param)
 * @returns decoded string (UTF-8)
 * @see https://www.rfc-editor.org/rfc/rfc4648#section-5
 */
export const base64UrlDecode = (base64url: string): string => {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) {
    base64 += "=".repeat(4 - pad);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
};
