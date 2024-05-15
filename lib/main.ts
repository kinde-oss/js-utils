import { subtle, getRandomValues } from "uncrypto";
import { AuthUrlOptions, PKCEChallenge, IssuerRouteTypes } from "./types";

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

/**
 *
 * @param options
 * @param type
 * @returns URL to redirect to
 */
export const generateAuthUrl = (
  options: AuthUrlOptions,
  type: IssuerRouteTypes = IssuerRouteTypes.login,
): URL => {
  const authUrl = new URL(options.issuerURL + options.issuerRoutes[type]);

  const searchParams: Record<string, string> = {
    redirect_uri: generateCallbackUrl(
      options.redirectURL,
      options.redirectRoutes.callback,
    ),
    client_id: options.clientID,
    response_type: options.responseType,
    scope: options.scope,
    code_challenge: options.code_challenge,
    code_challenge_method: options.codeChallengeMethod,
    state: options.state,
    audience: options.audience,
    start_page: type === IssuerRouteTypes.register ? "registration" : "",
  };

  for (const [key, value] of Object.entries(options)) {
    if (key === "kindeAuth" || searchParams[key]) continue;
    if (value !== null && value !== undefined) {
      searchParams[key] = value;
    }
  }

  authUrl.search = new URLSearchParams(searchParams).toString();
  return authUrl;
};

/**
 *
 * @param base Base domain URL
 * @param path Path to append to the base URL
 * @returns
 */
const generateCallbackUrl = (base: string, path: string): string => {
  const siteUrl = base.endsWith("/") ? base.slice(0, -1) : base;
  const callbackPath = path.startsWith("/") ? path.substring(1) : path;
  return `${siteUrl}/${callbackPath}`;
};

/**
 *
 * @param code_verifier Verifier to generate challenge from
 * @returns URL safe base64 encoded string
 */
export async function pkceChallengeFromVerifier(
  code_verifier: string,
): Promise<string> {
  const hashed = await sha256(code_verifier);
  const hashedString = Array.from(new Uint8Array(hashed))
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return base64UrlEncode(hashedString);
}

/**
 * Creates a random string of provided length.
 * @param {number} length
 * @returns {string} required secret
 */
export const generateRandomString = (length: number = 28): string => {
  const bytesNeeded = Math.ceil(length / 2);
  const array = new Uint32Array(bytesNeeded);
  getRandomValues(array);
  let result = Array.from(array, (dec) =>
    ("0" + dec.toString(16)).slice(-2),
  ).join("");
  if (length % 2 !== 0) {
    // If the requested length is odd, remove the last character to adjust the length
    result = result.slice(0, -1);
  }
  return result;
};

/**
 * Sanitizes the redirect URL
 * @param param0 {baseUrl: string, url: string}
 * @returns URL
 */
export const sanitizeRedirect = ({
  baseUrl,
  url,
}: {
  baseUrl: string;
  url: string;
}): string => {
  if (url.startsWith("/")) {
    return `${baseUrl}${url}`;
  } else if (new URL(url).origin === baseUrl) {
    return url;
  }

  return baseUrl;
};

/**
 * setups up PKCE challenge
 * @returns
 */
export const setupChallenge = () => {
  return { state: generateRandomString(), ...pkceChallenge() };
};

/**
 * Calculate the SHA256 hash of the input text.
 * @param plain the text to hash
 * @returns a promise that resolves to an ArrayBuffer
 */
export const sha256 = (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return subtle.digest("SHA-256", data);
};

export async function generateChallenge(code_verifier: string) {
  return (await sha256(code_verifier)).toString();
}

/**
 *
 * @returns
 */
export const pkceChallenge = async (): Promise<PKCEChallenge> => {
  const codeVerifier = generateRandomString();
  return {
    codeVerifier,
    codeChallenge: await generateChallenge(codeVerifier),
  };
};
