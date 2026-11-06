import { sanitizeUrl } from "../sanitizeUrl";

type OpenIdConfiguration = {
  acr_values_supported?: unknown;
};

const discoveryCache = new Map<string, Promise<OpenIdConfiguration>>();

export const clearStepUpDiscoveryCache = (): void => {
  discoveryCache.clear();
};

const fetchOpenIdConfiguration = async (
  domain: string,
): Promise<OpenIdConfiguration> => {
  const normalized = sanitizeUrl(domain);
  const cached = discoveryCache.get(normalized);
  if (cached) {
    return cached;
  }

  const pending = fetch(`${normalized}/.well-known/openid-configuration`).then(
    async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to read OpenID configuration from ${normalized}: ${response.status}`,
        );
      }
      return (await response.json()) as OpenIdConfiguration;
    },
  );

  discoveryCache.set(normalized, pending);
  try {
    return await pending;
  } catch (error) {
    discoveryCache.delete(normalized);
    throw error;
  }
};

/**
 * Whether the issuer advertises `acr_values_supported` with `mfa` or `phr`.
 * When this is false, Kinde ignores `acr_values` and `max_age`.
 */
export const isStepUpSupported = async (domain: string): Promise<boolean> => {
  const configuration = await fetchOpenIdConfiguration(domain);
  if (!Array.isArray(configuration.acr_values_supported)) {
    return false;
  }
  return configuration.acr_values_supported.some(
    (value) => value === "mfa" || value === "phr",
  );
};
