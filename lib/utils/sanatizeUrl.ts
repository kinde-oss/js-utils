//function to remove trailing slash
export const sanatizeURL = (url: string): string => {
  return url.replace(/\/$/, "");
};
