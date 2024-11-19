/**
 * Encodes the provided ArrayBuffer string to base-64 format.
 * @param str String to encode
 * @returns encoded string
 */
export const base64UrlEncode = (input: string | ArrayBuffer): string => {
  const toBase64Url = (str: string): string =>
    btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  if (input instanceof ArrayBuffer) {
    const uint8Array = new Uint8Array(input);
    const binaryString = String.fromCharCode(...uint8Array);
    return toBase64Url(binaryString);
  }

  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(input);
  const binaryString = String.fromCharCode(...uint8Array);
  return toBase64Url(binaryString);
};
