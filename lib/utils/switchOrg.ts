import { IssuerRouteTypes, OrgCode, PromptTypes, type LoginOptions } from "../types";
import { generateAuthUrl } from "./generateAuthUrl";

export interface SwitchOrgParams {
  domain: string;
  orgCode: OrgCode;
  redirectURL: string;
}

/**
 * Switch the active organization without prompting.
 * @param params - { domain, orgCode, redirectURL }
 * @returns OAuth URL bundle to redirect to (auto-switches active org).
 * @throws Error when domain, orgCode, or redirectURL are missing.
 */
export const switchOrg = ({
  domain,
  orgCode,
  redirectURL,
}: SwitchOrgParams): ReturnType<typeof generateAuthUrl> => {
  if (!domain) {
    throw new Error("domain is required for switchOrg");
  }
  if (!orgCode) {
    throw new Error("orgCode is required for switchOrg");
  }

  if (!redirectURL) {
    throw new Error("redirectURL is required for switchOrg");
  }
  const loginOptions: LoginOptions = {
    prompt: PromptTypes.none,
    orgCode,
    redirectURL,
  };

  return generateAuthUrl(domain, IssuerRouteTypes.login, loginOptions);
};
