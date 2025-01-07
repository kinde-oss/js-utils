export const isCustomDomain = (domain: string): boolean => {
  return !domain.match("^[a-zA-Z]*.kinde.com");
};
