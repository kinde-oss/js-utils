/**
 * Encodes the provided ArrayBuffer string to base-64 format.
 * @param str String to encode
 * @returns encoded string
 */
export const base64UrlEncode = (str: string | ArrayBuffer): string => {
  if (str instanceof ArrayBuffer) {
    const numberArray = Array.from<number>(new Uint8Array(str));
    return btoa(String.fromCharCode.apply(null, numberArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  
  const encoder = new TextEncoder();
  const uintArray = encoder.encode(str);
  const charArray = Array.from(uintArray);
  return btoa(String.fromCharCode.apply(null, charArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

};
