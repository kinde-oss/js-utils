import { sanitizeUrl } from "../sanitizeUrl";

type OpenIdConfiguration = {
  acr_values_supported?: unknown;
};

type CacheEntry = {
  configuration: Promise<OpenIdConfiguration>;
  /** Epoch ms. Infinity while the request is in flight. */
  expiresAt: number;
};

const DISCOVERY_TTL_MS = 60 * 60 * 1000;

const discoveryCache = new Map<string, CacheEntry>();

/** Empties the discovery cache so the next check fetches discovery again. */
export const clearStepUpDiscoveryCache = (): void => {
  discoveryCache.clear();
};

/**
 * Fetches the issuer's OpenID configuration. Concurrent calls share one request.
 * A successful result is reused for an hour; a failed request is not cached.
 */
const fetchOpenIdConfiguration = async (
  domain: string,
): Promise<OpenIdConfiguration> => {
  const normalized = sanitizeUrl(domain);
  const cached = discoveryCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.configuration;
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

  const entry: CacheEntry = { configuration: pending, expiresAt: Infinity };
  discoveryCache.set(normalized, entry);
  try {
    const configuration = await pending;
    entry.expiresAt = Date.now() + DISCOVERY_TTL_MS;
    return configuration;
  } catch (error) {
    if (discoveryCache.get(normalized) === entry) {
      discoveryCache.delete(normalized);
    }
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
