import { StorageKeys } from "./sessionManager/types";

export type OrgCode = `org_${string}`;

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
    | "supportsReauth"
    | "reauthState"
    | "planInterest"
    | "pricingTableKey"
    | "pagesMode"
  >
>;

export enum PortalPage {
  organizationDetails = "organization_details",
  organizationMembers = "organization_members",
  organizationPlanDetails = "organization_plan_details",
  organizationPaymentDetails = "organization_payment_details",
  organizationPlanSelection = "organization_plan_selection",
  profile = "profile",
}

/**
 * @deprecated This enum is deprecated and will be removed in a future version.
 * Please use `PortalPage` instead.
 */
export enum ProfilePage {
  organizationDetails = "organization_details",
  organizationMembers = "organization_members",
  organizationPlanDetails = "organization_plan_details",
  organizationPaymentDetails = "organization_payment_details",
  organizationPlanSelection = "organization_plan_selection",
  profile = "profile",
}

export type GeneratePortalUrlParams = {
  domain: string;
  returnUrl: string;
  subNav?: PortalPage;
};

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
  audience?: string | string[];
  /** Client ID of the application
   *
   * This can be found in the application settings in the Kinde dashboard
   */
  clientId?: string;
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
  /**
   * Define if the auth instigator support reauth on expired flows
   */
  supportsReauth?: boolean;
  /**
   * Base64 encoded auth parameters
   */
  reauthState?: string;
  /**
   * Plan the user has indicated interest in
   */
  planInterest?: string;
  /**
   * Key for the pricing table to use (optional)
   */
  pricingTableKey?: string;
  /**
   * Configuration mode for custom code pages
   */
  pagesMode?: "preview";
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

export type GetPermissionOptions = ForceApi;
export type GetPermissionsOptions = ForceApi;
export type GetRolesOptions = ForceApi;

type ForceApi = {
  /**
   * If true, the API will be called to check permissions, otherwise it will check the token.
   * This is useful for ensuring the latest permissions are fetched, but may incur additional API calls
   */
  forceApi?: boolean;
};

type Metadata = {
  has_more: boolean;
  next_page_starting_after: string;
};

export type BaseAccountResponse = {
  metadata: Metadata;
};
