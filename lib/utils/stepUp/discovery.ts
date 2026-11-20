import { sanitizeUrl } from "../sanitizeUrl";
import { createTokenRequestDeadline } from "../tokenGeneration";

type OpenIdConfiguration = {
  acr_values_supported?: unknown;
};

type CacheEntry = {
  configuration: Promise<OpenIdConfiguration>;
  /** Set once the request succeeds, so a sync reader can use the cache. */
  resolved?: OpenIdConfiguration;
  /** Epoch ms. Infinity while the request is in flight. */
  expiresAt: number;
};

const DISCOVERY_TTL_MS = 60 * 60 * 1000;
/** Bounds a discovery fetch and its JSON body. A stalled attempt must not stay cached. */
export const DISCOVERY_TIMEOUT_MS = 30_000;

const discoveryCache = new Map<string, CacheEntry>();

/** Empties the discovery cache so the next check fetches discovery again. */
export const clearStepUpDiscoveryCache = (): void => {
  discoveryCache.clear();
};

type RequestDeadline = ReturnType<typeof createTokenRequestDeadline>;

/**
 * Reads discovery. The deadline aborts a stalled fetch and rejects a body that
 * does not arrive in time, so the cached promise cannot stay pending.
 */
const readOpenIdConfiguration = async (
  domain: string,
  deadline: RequestDeadline,
): Promise<OpenIdConfiguration> => {
  const response = await deadline.readBody(() =>
    fetch(`${domain}/.well-known/openid-configuration`, {
      signal: deadline.signal,
    }),
  );
  if (!response.ok) {
    throw new Error(
      `Failed to read OpenID configuration from ${domain}: ${response.status}`,
    );
  }
  const configuration = (await deadline.readBody(() =>
    response.json(),
  )) as OpenIdConfiguration;
  deadline.assertWithinDeadline();
  return configuration;
};

/** True when discovery includes `acr_values_supported`. A null value does not count. */
export const acrValuesSupportedPresent = (
  configuration: OpenIdConfiguration,
): boolean => configuration.acr_values_supported != null;

/**
 * Fetches the issuer's OpenID configuration. Concurrent calls share one request.
 * A successful result is reused for an hour. A failed request, or one that
 * passes its deadline, is removed so the next call can try again.
 * A previously discovered unsupported document stays readable by sync callers
 * across that refresh until a new document arrives.
 */
const fetchOpenIdConfiguration = async (
  domain: string,
): Promise<OpenIdConfiguration> => {
  const normalized = sanitizeUrl(domain);
  const cached = discoveryCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.configuration;
  }

  const deadline = createTokenRequestDeadline(
    DISCOVERY_TIMEOUT_MS,
    () =>
      new DOMException(
        `OpenID configuration request timed out for ${normalized}`,
        "TimeoutError",
      ),
  );
  const entry: CacheEntry = {
    configuration: readOpenIdConfiguration(normalized, deadline),
    expiresAt: Infinity,
  };
  if (cached?.resolved && !acrValuesSupportedPresent(cached.resolved)) {
    entry.resolved = cached.resolved;
  }
  discoveryCache.set(normalized, entry);
  try {
    const configuration = await entry.configuration;
    entry.resolved = configuration;
    entry.expiresAt = Date.now() + DISCOVERY_TTL_MS;
    return configuration;
  } catch (error) {
    if (discoveryCache.get(normalized) === entry) {
      if (entry.resolved && !acrValuesSupportedPresent(entry.resolved)) {
        entry.expiresAt = 0;
      } else {
        discoveryCache.delete(normalized);
      }
    }
    throw error;
  } finally {
    deadline.settle();
  }
};

/**
 * Cached discovery answer for `domain`, or undefined when it has not been fetched.
 * A false result means `acr_values_supported` is absent. That false result is kept
 * after the cache expires, including while a refresh is in flight. A supported
 * result is dropped once the cache expires. An issuer that has never resolved
 * stays undefined.
 */
export const cachedStepUpSupported = (domain: string): boolean | undefined => {
  const normalized = sanitizeUrl(domain);
  const cached = discoveryCache.get(normalized);
  if (!cached?.resolved) {
    return undefined;
  }
  if (!acrValuesSupportedPresent(cached.resolved)) {
    return false;
  }
  if (!(cached.expiresAt > Date.now())) {
    return undefined;
  }
  return true;
};

/**
 * Whether `acr_values_supported` is present on `/.well-known/openid-configuration`.
 * The document is cached. When this is false, Kinde ignores `acr_values` and `max_age`,
 * and `auth_time` must not be used for recency.
 */
export const isStepUpSupported = async (domain: string): Promise<boolean> => {
  const configuration = await fetchOpenIdConfiguration(domain);
  return acrValuesSupportedPresent(configuration);
};
