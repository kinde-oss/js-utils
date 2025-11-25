/**
 * Encodes the provided ArrayBuffer or string to base-64 format.
 * @param input String or ArrayBuffer to encode
 * @returns encoded string
 */
export const base64UrlEncode = (input: string | ArrayBuffer): string => {
  const toBase64Url = (str: string): string => btoa(str);

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
