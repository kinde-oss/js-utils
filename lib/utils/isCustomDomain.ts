export const isCustomDomain = (domain: string): boolean => {
  return !domain.match(
    /^(?:https?:\/\/)?[a-zA-Z0-9][-a-zA-Z0-9]*\.kinde\.com$/i,
  );
};
