/**
 * Creates a random string, with a non-cryptographic fallback for compatibility.
 * Do not use this helper for security-sensitive values.
 */
export const generateRandomString = (length: number = 28): string => {
  const crypto = globalThis.crypto;
  if (typeof crypto?.getRandomValues === "function") {
    return randomHex(crypto, length);
  }
  return generateRandomStringNonCrypto(length);
};

export const generateSecureRandomString = (length: number): string => {
  const crypto = globalThis.crypto;
  if (typeof crypto?.getRandomValues !== "function") {
    throw new Error("Secure randomness requires crypto.getRandomValues.");
  }
  return randomHex(crypto, length);
};

function randomHex(crypto: Crypto, length: number): string {
  const arr = new Uint8Array(length / 2);
  crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join("");
}

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
