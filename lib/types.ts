import { StorageKeys } from "./sessionManager/types";

export enum Scopes {
  email = "email",
  profile = "profile",
  openid = "openid",
  offline_access = "offline",
}

export enum PromptTypes {
  none = "none",
  create = "create",
  login = "login",
}

export type LoginMethodParams<T = Record<string, string>> = Partial<
  Pick<
    LoginOptions<T>,
    | "audience"
    | "scope"
    | "isCreateOrg"
    | "prompt"
    | "lang"
    | "loginHint"
    | "orgCode"
    | "orgName"
    | "connectionId"
    | "redirectURL"
    | "hasSuccessPage"
    | "workflowDeploymentId"
    | "properties"
  >
>;

export type KindeProperties = Partial<{
  // UTM tags
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;

  // Google Ads smart campaign tracking
  gclid: string;
  click_id: string;
  hsa_acc: string;
  hsa_cam: string;
  hsa_grp: string;
  hsa_ad: string;
  hsa_src: string;
  hsa_tgt: string;
  hsa_kw: string;
  hsa_mt: string;
  hsa_net: string;
  hsa_ver: string;

  // Marketing category
  match_type: string;
  keyword: string;
  device: string;
  ad_group_id: string;
  campaign_id: string;
  creative: string;
  network: string;
  ad_position: string;
  fbclid: string;
  li_fat_id: string;
  msclkid: string;
  twclid: string;
  ttclid: string;
}>;

export type LoginOptions<T = Record<string, string>> = {
  /** Audience to include in the token */
  audience?: string;
  /** Client ID of the application
   *
   * This can be found in the application settings in the Kinde dashboard
   */
  clientId: string;
  /**
   * Code challenge for PKCE
   */
  codeChallenge?: string;
  /**
   * Code challenge method for PKCE
   */
  codeChallengeMethod?: string;
  /**
   * Connection ID to use for the login
   *
   * This is found in the authentication settings in the Kinde dashboard
   */
  connectionId?: string;
  /**
   * Whether the user is creating an organization on registration
   */
  isCreateOrg?: boolean;
  /**
   * Language to use for the login in 2 letter ISO format
   */
  lang?: string;
  /**
   * Login hint to use for the login
   *
   * This can be in one of the following formats:
   * - joe@blogs.com
   * - phone:+447700900000:gb
   * - username:joebloggs
   */
  loginHint?: string;
  /**
   * Organization code to use for the login
   */
  orgCode?: string;
  /**
   * Organization name to be used when creating an organization at registration
   */
  orgName?: string;
  /**
   * Prompt to use for the login
   *
   * This can be one of the following:
   * - login (force user re-authentication)
   * - create (show registration screen)
   * - none (silently authenticate user without prompting for action)
   *
   */
  prompt?: PromptTypes;
  /**
   * Redirect URL to use for the login
   */
  redirectURL: string;
  /**
   * Response type to use for the login
   *
   * Kinde currently only supports `code`
   */
  responseType?: string;
  /**
   * Scopes to include in the token
   *
   * This can be one or more of the following:
   * - email
   * - profile
   * - openid
   * - offline
   */
  scope?: Scopes[];
  /**
   * State to use for the login
   */
  state?: string;
  /**
   * Whether to show the success screen at the end of the flow, this is most useful when the callback is not a webpage.
   */
  hasSuccessPage?: boolean;
  /**
   * Single use code to prevent replay attacks
   */
  nonce?: string;
  /**
   * Workflow Deployment ID to trigger on authentication
   */
  workflowDeploymentId?: string;
  /**
   * Properties to be passed
   */
  properties?: T & KindeProperties;
};

export enum IssuerRouteTypes {
  logout = "logout",
  login = "login",
  register = "registration",
  token = "token",
  profile = "profile",
}

export type PKCEChallenge = {
  codeVerifier: string;
  codeChallenge: string;
};

export type PKCEChallengeState = PKCEChallenge & {
  state: string;
};

export interface RefreshTokenResult {
  success: boolean;
  error?: string;
  [StorageKeys.accessToken]?: string;
  [StorageKeys.idToken]?: string;
  [StorageKeys.refreshToken]?: string;
}

export enum RefreshType {
  refreshToken,
  cookie,
}
