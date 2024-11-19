//function to remove trailing slash
export const sanitizeUrl = (url: string): string => {
  return url.replace(/\/$/, "");
};
