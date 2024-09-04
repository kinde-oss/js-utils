/**
 *
 * @param str String to encode
 * @returns encoded string
 */
export const base64UrlEncode = (str: string): string => {
  const encoder = new TextEncoder();
  const uintArray = encoder.encode(str);
  const charArray = Array.from(uintArray);
  return btoa(String.fromCharCode.apply(null, charArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};
