import { getClaims } from ".";
import { getClaimsSync } from "./getClaims";

export type UserProfile = {
  id: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  picture?: string;
};

const _getUserProfileCore = <T>(
  idToken:
    | (T & {
        sub: string;
        given_name: string;
        family_name: string;
        email: string;
        picture: string;
      })
    | null,
): (UserProfile & T) | null => {
  if (!idToken) {
    return null;
  }
  const { sub } = idToken;
  if (!sub) {
    console.error("No sub in idToken");
    return null;
  }
  return {
    id: idToken.sub,
    givenName: idToken.given_name,
    familyName: idToken.family_name,
    email: idToken.email,
    picture: idToken.picture,
  } as UserProfile & T;
};

export const getUserProfile = async <T>(): Promise<
  (UserProfile & T) | null
> => {
  const idToken = await getClaims<{
    sub: string;
    given_name: string;
    family_name: string;
    email: string;
    picture: string;
  }>("idToken");
  return _getUserProfileCore<T>(idToken);
};

export const getUserProfileSync = <T>(): (UserProfile & T) | null => {
  const idToken = getClaimsSync<{
    sub: string;
    given_name: string;
    family_name: string;
    email: string;
    picture: string;
  }>("idToken");
  return _getUserProfileCore<T>(idToken);
};
