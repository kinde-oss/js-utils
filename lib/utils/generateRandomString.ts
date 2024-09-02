/**
 * Creates a random string of provided length.
 * @param {number} length
 * @returns {string} required secret
 */
export const generateRandomString = (length: number = 28): string => {
  const arr = new Uint8Array(length / 2);
  crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join("");
};

function dec2hex(dec: number) {
  return dec.toString(16).padStart(2, "0");
}
