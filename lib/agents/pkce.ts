import { base64UrlEncode } from "../utils/base64UrlEncode";
import { AgentAuthError } from "./errors";
import type { CryptoAdapter } from "./types";

const randomBase64Url = (
  byteLength: number,
  adapter?: CryptoAdapter,
): string => {
  const bytes = new Uint8Array(byteLength);
  if (adapter?.getRandomValues) {
    adapter.getRandomValues(bytes);
  } else if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new AgentAuthError(
      "crypto_unavailable",
      "crypto.getRandomValues is required",
    );
  }
  return base64UrlEncode(bytes.buffer as ArrayBuffer);
};

const sha256 = async (
  data: Uint8Array,
  adapter?: CryptoAdapter,
): Promise<ArrayBuffer> => {
  let digest: ArrayBuffer | Uint8Array;
  if (adapter?.sha256) {
    digest = await adapter.sha256(data);
  } else if (globalThis.crypto?.subtle) {
    digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      data as BufferSource,
    );
  } else {
    throw new AgentAuthError(
      "crypto_unavailable",
      "A SHA-256 implementation is required for S256 PKCE: provide crypto.subtle or a crypto adapter",
    );
  }
  return digest instanceof Uint8Array
    ? (digest.buffer.slice(
        digest.byteOffset,
        digest.byteOffset + digest.byteLength,
      ) as ArrayBuffer)
    : digest;
};

export const generateState = (adapter?: CryptoAdapter): string =>
  randomBase64Url(16, adapter);

export const generatePkcePair = async (
  adapter?: CryptoAdapter,
): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> => {
  const codeVerifier = randomBase64Url(32, adapter);
  const digest = await sha256(new TextEncoder().encode(codeVerifier), adapter);
  return { codeVerifier, codeChallenge: base64UrlEncode(digest) };
};
