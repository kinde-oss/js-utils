import { base64UrlEncode, getInsecureStorage, StorageKeys } from "../main";
import { IssuerRouteTypes, LoginOptions, PromptTypes } from "../types";
import { generateRandomString } from "./generateRandomString";
import { mapLoginMethodParamsForUrl } from "./mapLoginMethodParamsForUrl";

/**
 *
 * @param options
 * @param type
 * @returns URL to redirect to
 */
export const generateAuthUrl = async (
  domain: string,
  type: IssuerRouteTypes = IssuerRouteTypes.login,
  options: LoginOptions,
): Promise<{
  url: URL;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeVerifier: string;
}> => {
  const authUrl = new URL(`${domain}/oauth2/auth`);
  const activeStorage = getInsecureStorage();
  const searchParams: Record<string, string> = {
    client_id: options.clientId,
    response_type: options.responseType || "code",
    ...mapLoginMethodParamsForUrl(options),
  };

  if (!options.state) {
    options.state = generateRandomString(32);
    if (activeStorage) {
      activeStorage.setSessionItem(StorageKeys.state, options.state);
    }
  }
  searchParams["state"] = options.state;

  if (!options.nonce) {
    options.nonce = generateRandomString(16);
  }
  searchParams["nonce"] = options.nonce;
  if (activeStorage) {
    activeStorage.setSessionItem(StorageKeys.nonce, options.nonce);
  }

  let returnCodeVerifier = "";
  if (options.codeChallenge) {
    searchParams["code_challenge"] = options.codeChallenge;
  } else {
    const { codeVerifier, codeChallenge } = await generatePKCEPair();
    returnCodeVerifier = codeVerifier;
    if (activeStorage) {
      activeStorage.setSessionItem(StorageKeys.codeVerifier, codeVerifier);
    }
    searchParams["code_challenge"] = codeChallenge;
  }
  searchParams["code_challenge_method"] = "S256";

  if (options.codeChallengeMethod) {
    searchParams["code_challenge_method"] = options.codeChallengeMethod;
  }

  if (!options.prompt && type === IssuerRouteTypes.register) {
    searchParams["prompt"] = PromptTypes.create;
  }

  authUrl.search = new URLSearchParams(searchParams).toString();
  return {
    url: authUrl,
    state: searchParams["state"],
    nonce: searchParams["nonce"],
    codeChallenge: searchParams["code_challenge"],
    codeVerifier: returnCodeVerifier,
  };
};

export async function generatePKCEPair(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(52);
  const data = new TextEncoder().encode(codeVerifier);
  const hashed = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = base64UrlEncode(hashed);
  return { codeVerifier, codeChallenge };
}
