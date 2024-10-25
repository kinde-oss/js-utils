import { base64UrlEncode, getActiveStorage, StorageKeys } from "../main";
import { IssuerRouteTypes, LoginOptions } from "../types";
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
): Promise<{ url: URL; state: string; nonce: string }> => {
  const authUrl = new URL(`${domain}/oauth2/auth`);
  const activeStorage = getActiveStorage();
  const searchParams: Record<string, string> = {
    client_id: options.clientId,
    response_type: options.responseType || "code",
    start_page: type,
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

  if (options.codeChallenge) {
    searchParams["code_challenge"] = options.codeChallenge;
  } else {
    const { codeVerifier, codeChallenge } = await generatePKCEPair();
    if (activeStorage) {
      activeStorage.setSessionItem(StorageKeys.codeVerifier, codeVerifier);
    }
    searchParams["code_challenge"] = codeChallenge;
  }
  searchParams["code_challenge_method"] = "S256";

  if (options.codeChallengeMethod) {
    searchParams["code_challenge_method"] = options.codeChallengeMethod;
  }

  authUrl.search = new URLSearchParams(searchParams).toString();
  return {
    url: authUrl,
    state: searchParams["state"],
    nonce: searchParams["nonce"],
  };
};

async function generatePKCEPair(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(32);
  const data = new TextEncoder().encode(codeVerifier);
  const hashed = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = base64UrlEncode(new TextDecoder().decode(hashed));
  return { codeVerifier, codeChallenge };
}
