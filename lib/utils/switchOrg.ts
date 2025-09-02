import { IssuerRouteTypes, LoginOptions, PromptTypes } from "../types";
import { generateAuthUrl } from "./generateAuthUrl";

interface SwitchOrgParams {
  domain: string;
  orgCode: string;
  redirectURL: string;
}

/**
 *
 * @param SwitchOrgParams
 * @returns URL to redirect to which will auto switch the user's active organization without prompting
 */
export const switchOrg = async ({
  domain,
  orgCode,
  redirectURL,
}: SwitchOrgParams): Promise<{
  url: URL;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeVerifier: string;
}> => {
  if (!orgCode) {
    throw new Error("Org code is required for switchOrg");
  }

  if (!redirectURL) {
    throw new Error("Redirect URL is required for switchOrg");
  }

  const loginOptions: LoginOptions = {
    prompt: PromptTypes.none,
    orgCode,
    redirectURL,
  };

  return await generateAuthUrl(domain, IssuerRouteTypes.login, loginOptions);
};
