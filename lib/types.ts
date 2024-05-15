export interface AuthUrlOptions {
  code_challenge: string;
  state: string;
  clientID: string;
  issuerURL: string;
  redirectURL: string;
  redirectRoutes: {
    callback: string;
    logout: string;
  };
  responseType: string;
  scope: string;
  codeChallengeMethod: string;
  audience: string;
  issuerRoutes: {
    [key in IssuerRouteTypes]: string;
  };
}

export enum IssuerRouteTypes {
  logout = "logout",
  login = "login",
  register = "register",
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
