import { IssuerRouteTypes, LoginOptions } from "../types";
import { generateRandomString } from "./generateRandomString";
import { mapLoginMethodParamsForUrl } from "./mapLoginMethodParamsForUrl";

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
): { url: URL; state: string; nonce: string } => {
  const authUrl = new URL(`${domain}/oauth2/auth`);

  const searchParams: Record<string, string> = {
    client_id: options.clientId,
    response_type: options.responseType || "code",
    start_page: type,
    ...mapLoginMethodParamsForUrl(options),
  };

  const generatedState = generateRandomString(32);
  const generatedNonce = generateRandomString(16);

  searchParams["state"] = options.state || generatedState;
  searchParams["nonce"] = generatedNonce;

  if (options.codeChallenge) {
    searchParams["code_challenge"] = options.codeChallenge;
    searchParams["code_challenge_method"] = "S256";
  }

  if (options.codeChallengeMethod) {
    searchParams["code_challenge_method"] = options.codeChallengeMethod;
  }

  authUrl.search = new URLSearchParams(searchParams).toString();
  return { url: authUrl, state: generatedState, nonce: generatedNonce };
};
