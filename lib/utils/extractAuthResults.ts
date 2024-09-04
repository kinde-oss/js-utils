export const extractAuthResults = (url: string) => {
  url = url.split("?")[1];
  const searchParams = new URLSearchParams(url);
  const accessToken = searchParams.get("access_token");

  const result = {
    accessToken: accessToken,
    idToken: searchParams.get("id_token"),
    expiresIn: +(searchParams.get("expires_in") || 0),
  };
  return result;
};
