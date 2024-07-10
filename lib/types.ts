export enum Scopes {
  email = "email",
  profile = "profile",
  openid = "openid",
  offline_access = "offline_access",
}

export type LoginMethodParams = Pick<
  LoginOptions,
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
>;

export type LoginOptions = {
  audience?: string;
  clientId: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  connectionId?: string;
  isCreateOrg: string;
  lang: string;
  loginHint: string;
  orgCode: string;
  orgName: string;
  prompt: string;
  redirectURL: string;
  responseType: string;
  scope: Scopes[];
  state: string;
  callbackURL: string;
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
