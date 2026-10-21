import { base64UrlEncode } from "../utils/base64UrlEncode";
import { AgentAuthError } from "./errors";

const randomBase64Url = (byteLength: number): string => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new AgentAuthError(
      "crypto_unavailable",
      "crypto.getRandomValues is required",
    );
  }
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer as ArrayBuffer);
};

export const generateState = (): string => randomBase64Url(16);

export const generatePkcePair = async (): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> => {
  if (!globalThis.crypto?.subtle) {
    throw new AgentAuthError(
      "crypto_unavailable",
      "crypto.subtle is required for S256 PKCE",
    );
  }
  const codeVerifier = randomBase64Url(32);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  return { codeVerifier, codeChallenge: base64UrlEncode(digest) };
};
