/**
 * Creates a random string of provided length.
 * @param {number} length
 * @returns {string} required secret
 */
export const generateRandomString = (length: number = 28): string => {
  if (crypto) {
    const arr = new Uint8Array(length / 2);
    crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join("");
  } else {
    return generateRandomStringNonCrypto(length);
  }
};

function dec2hex(dec: number) {
  return dec.toString(16).padStart(2, "0");
}

function generateRandomStringNonCrypto(length: number = 28) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}
