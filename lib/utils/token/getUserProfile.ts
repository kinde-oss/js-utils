import { getDecodedToken } from "./getDecodedToken";

export type UserProfile = {
  id: string;
  givenName: string;
  familyName: string;
  email: string;
  picture: string;
};

export const getUserProfile = async <T>(): Promise<
  (UserProfile & T) | null
> => {
  const idToken = await getDecodedToken<{
    sub: string;
    given_name: string;
    family_name: string;
    email: string;
    picture: string;
  }>("idToken");
  if (!idToken) {
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
