import { stat } from "fs";
import { IssuerRouteTypes, LoginMethodParams, LoginOptions } from "./types";

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

export const mapLoginMethodParamsForUrl = (
  options: Partial<LoginMethodParams>,
): Record<string, string> => {
  const translate: Record<string, string | undefined> = {
    login_hint: options.loginHint,
    is_create_org: options.isCreateOrg?.toString(),
    connection_id: options.connectionId,
    redirect_uri: options.redirectURL
      ? sanitizeRedirect(options.redirectURL)
      : undefined,
    audience: options.audience,
    scope: options.scope?.join(" ") || "email profile openid offline",
    prompt: options.prompt,
    lang: options.lang,
    org_code: options.orgCode,
    org_name: options.orgName,
    has_success_page: options.hasSuccessPage?.toString(),
  };

  Object.keys(translate).forEach(
    (key) => translate[key] === undefined && delete translate[key],
  );
  return translate as Record<string, string>;
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
    client_id: options.clientId,
    response_type: options.responseType || "code",
    start_page: type,
    ...mapLoginMethodParamsForUrl(options),
  };

  if (options.state.length < 8) {
    throw new Error("State must be at least 8 characters long");
  }
  searchParams["state"] = options.state;

  if (options.codeChallenge) {
    searchParams["code_challenge"] = options.codeChallenge;
    searchParams["code_challenge_method"] = "S256";
  }

  if (options.codeChallengeMethod) {
    searchParams["code_challenge_method"] = options.codeChallengeMethod;
  }

  authUrl.search = new URLSearchParams(searchParams).toString();
  return authUrl;
};
