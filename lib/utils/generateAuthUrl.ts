import { base64UrlEncode, getInsecureStorage, StorageKeys } from "../main";
import { IssuerRouteTypes, LoginOptions, PromptTypes } from "../types";
import { generateRandomString } from "./generateRandomString";
import { mapLoginMethodParamsForUrl } from "./mapLoginMethodParamsForUrl";

interface generateAuthUrlConfig {
  disableUrlSanitization: boolean;
}

/**
 *
 * @param options
 * @param type
 * @returns URL to redirect to
 */
export const generateAuthUrl = async (
  domain: string,
  type: IssuerRouteTypes = IssuerRouteTypes.login,
  loginOptions: LoginOptions,
  config?: generateAuthUrlConfig,
): Promise<{
  url: URL;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeVerifier: string;
}> => {
  const authPath = `${domain}/oauth2/auth`;
  const activeStorage = getInsecureStorage();
  const searchParams: Record<string, string> = {
    client_id: loginOptions.clientId,
    response_type: loginOptions.responseType || "code",
    ...mapLoginMethodParamsForUrl(loginOptions, config?.disableUrlSanitization),
  };

  if (!loginOptions.state) {
    loginOptions.state = generateRandomString(32);
  }
  if (activeStorage) {
    activeStorage.setSessionItem(StorageKeys.state, loginOptions.state);
  }
  searchParams["state"] = loginOptions.state;

  if (!loginOptions.nonce) {
    loginOptions.nonce = generateRandomString(16);
  }
  searchParams["nonce"] = loginOptions.nonce;
  if (activeStorage) {
    activeStorage.setSessionItem(StorageKeys.nonce, loginOptions.nonce);
  }

  let returnCodeVerifier = "";
  if (loginOptions.codeChallenge) {
    searchParams["code_challenge"] = loginOptions.codeChallenge;
  } else {
    const { codeVerifier, codeChallenge } = await generatePKCEPair();
    returnCodeVerifier = codeVerifier;
    if (activeStorage) {
      activeStorage.setSessionItem(StorageKeys.codeVerifier, codeVerifier);
    }
    searchParams["code_challenge"] = codeChallenge;
  }
  searchParams["code_challenge_method"] = "S256";

  if (loginOptions.codeChallengeMethod) {
    searchParams["code_challenge_method"] = loginOptions.codeChallengeMethod;
  }

  if (!loginOptions.prompt && type === IssuerRouteTypes.register) {
    searchParams["prompt"] = PromptTypes.create;
  }

  const queryString = new URLSearchParams(searchParams).toString();

  return {
    url: new URL(`${authPath}?${queryString}`),
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
  let codeChallenge = "";
  if (!crypto) {
    codeChallenge = base64UrlEncode(btoa(codeVerifier));
  } else {
    const hashed = await crypto.subtle.digest("SHA-256", data);
    codeChallenge = base64UrlEncode(hashed);
  }
  return { codeVerifier, codeChallenge };
}
