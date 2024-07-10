// import { getRandomValues,subtle } from "uncrypto";
import { IssuerRouteTypes, LoginOptions } from "./types";

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

//function to remove trailing slash
export const sanitizeRedirect = (url: string): string => {
  return url.replace(/\/$/, "");
};

/**
 *
 * @param options
 * @param type
 * @returns URL to redirect to
 */
export const generateAuthUrl = (
  domain: string,
  type: IssuerRouteTypes = IssuerRouteTypes.login,
  options: LoginOptions,
): URL => {
  const authUrl = new URL(`${domain}/oauth2/auth`);

  const searchParams: Record<string, string> = {
    redirect_uri: sanitizeRedirect(options.callbackURL),
    client_id: options.clientId,
    response_type: options.responseType || "code",
    scope: options.scope.join(" "),
    state: options.state,
    start_page: type,
  };

  if (options.codeChallenge) {
    searchParams["code_challenge"] = options.codeChallenge;
    searchParams["code_challenge_method"] = "S256";
  }

  if (options.codeChallengeMethod) {
    searchParams["code_challenge_method"] = options.codeChallengeMethod;
  }

  if (options.audience) {
    searchParams["audience"] = options.audience;
  }

  authUrl.search = new URLSearchParams(searchParams).toString();
  return authUrl;
};

// /**
//  * Creates a random string of provided length.
//  * @param {number} length
//  * @returns {string} required secret
//  */
// export const generateRandomString = (length: number = 28): string => {
//   const bytesNeeded = Math.ceil(length / 2);
//   const array = new Uint32Array(bytesNeeded);
//   getRandomValues(array);
//   let result = Array.from(array, (dec) =>
//     ("0" + dec.toString(16)).slice(-2),
//   ).join("");
//   if (length % 2 !== 0) {
//     // If the requested length is odd, remove the last character to adjust the length
//     result = result.slice(0, -1);
//   }
//   return result;
// };

// //////

// /**
//  *
//  * @param code_verifier Verifier to generate challenge from
//  * @returns URL safe base64 encoded string
//  */
// export async function pkceChallengeFromVerifier(
//   code_verifier: string,
// ): Promise<string> {
//   const hashed = await sha256(code_verifier);
//   const hashedString = Array.from(new Uint8Array(hashed))
//     .map((byte) => String.fromCharCode(byte))
//     .join("");
//   return base64UrlEncode(hashedString);
// }

// /**
//  * setups up PKCE challenge
//  * @returns
//  */
// export const setupChallenge = () => {
//   return { state: generateRandomString(), ...pkceChallenge() };
// };

// /**
//  * Calculate the SHA256 hash of the input text.
//  * @param plain the text to hash
//  * @returns a promise that resolves to an ArrayBuffer
//  */
// export const sha256 = (plain: string) => {
//   const encoder = new TextEncoder();
//   const data = encoder.encode(plain);
//   return subtle.digest("SHA-256", data);
// };

// export async function generateChallenge(code_verifier: string) {
//   return (await sha256(code_verifier)).toString();
// }

// /**
//  *
//  * @returns
//  */
// export const pkceChallenge = async (): Promise<PKCEChallenge> => {
//   const codeVerifier = generateRandomString();
//   return {
//     codeVerifier,
//     codeChallenge: await generateChallenge(codeVerifier),
//   };
// };
