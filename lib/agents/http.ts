import { AgentAuthError } from "./errors";
import type { FetchLike, FetchOptions } from "./types";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const PRIVATE_SUFFIXES = [
  ".localhost",
  ".local",
  ".localdomain",
  ".internal",
  ".home.arpa",
];

export const resolveFetch = (custom?: FetchLike): FetchLike => {
  const impl = custom ?? globalThis.fetch;
  if (typeof impl !== "function") {
    throw new AgentAuthError("fetch_unavailable", "No fetch implementation");
  }
  return impl;
};

export const stripTrailingSlash = (value: string): string => {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
};

export const parseUrl = (value: string, label: string): URL => {
  try {
    return new URL(value);
  } catch (cause) {
    throw new AgentAuthError(
      "invalid_url",
      `${label} is not a valid URL`,
      undefined,
      { cause },
    );
  }
};

export const assertSecureUrl = (value: string, label: string): URL => {
  const url = parseUrl(value, label);
  const secure =
    url.protocol === "https:" ||
    (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname));
  if (!secure) {
    throw new AgentAuthError("invalid_url", `${label} must use https`);
  }
  return url;
};

const parseIpv4 = (host: string): number[] | null => {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) =>
    /^\d{1,3}$/.test(part) ? Number(part) : NaN,
  );
  return numbers.every((n) => n >= 0 && n <= 255) ? numbers : null;
};

const isPrivateIpv4 = ([a, b, c]: number[]): boolean =>
  a === 0 ||
  a === 10 ||
  a === 127 ||
  a >= 224 ||
  (a === 100 && b >= 64 && b <= 127) ||
  (a === 169 && b === 254) ||
  (a === 172 && b >= 16 && b <= 31) ||
  (a === 192 && b === 168) ||
  (a === 192 && b === 0 && c === 0) ||
  (a === 198 && (b === 18 || b === 19));

const isPrivateIpv6 = (host: string): boolean => {
  const address = host.slice(1, -1);
  if (address === "::" || address === "::1") return true;

  const embedded = address.match(
    /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/,
  );
  if (embedded) {
    const high = parseInt(embedded[1], 16);
    const low = parseInt(embedded[2], 16);
    return isPrivateIpv4([high >> 8, high & 255, low >> 8, low & 255]);
  }
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    const ipv4 = parseIpv4(mapped[1]);
    return ipv4 ? isPrivateIpv4(ipv4) : true;
  }

  const first = parseInt(address.split(":")[0] || "0", 16);
  return (
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00
  );
};

export const isPrivateHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  const host = lower.endsWith(".") ? lower.slice(0, -1) : lower;
  if (host.startsWith("[")) return isPrivateIpv6(host);
  const ipv4 = parseIpv4(host);
  if (ipv4) return isPrivateIpv4(ipv4);
  return (
    !host.includes(".") ||
    PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
};

export const assertAllowedUrl = (
  value: string,
  label: string,
  options: Pick<FetchOptions, "allowPrivateNetworks"> = {},
): URL => {
  const url = assertSecureUrl(value, label);
  if (!options.allowPrivateNetworks && isPrivateHost(url.hostname)) {
    throw new AgentAuthError(
      "private_network_blocked",
      `${label} points to a private or local address`,
    );
  }
  return url;
};

export const normalizeScope = (scope?: string | string[]): string[] => {
  if (!scope) return [];
  const parts = (Array.isArray(scope) ? scope : [scope]).flatMap((s) =>
    s.split(/\s+/),
  );
  return [...new Set(parts.map((s) => s.trim()).filter(Boolean))];
};

export const assertNoOpenId = (scopes: string[]): void => {
  if (scopes.includes("openid")) {
    throw new AgentAuthError(
      "openid_scope_not_allowed",
      "The openid scope must not be requested by agents",
    );
  }
};

export const stripOpenId = (scopes: string[]): string[] =>
  scopes.filter((s) => s !== "openid");

export const readJson = async <T>(
  response: Response,
  label: string,
): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new AgentAuthError(
      "invalid_response",
      `${label} returned a non-JSON body`,
      response.status,
      { cause },
    );
  }
};

export const toOAuthError = async (
  response: Response,
  label: string,
): Promise<AgentAuthError> => {
  let body: { error?: unknown; error_description?: unknown } | undefined;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const code = typeof body?.error === "string" ? body.error : "http_error";
  const description =
    typeof body?.error_description === "string"
      ? body.error_description
      : `${label} failed with status ${response.status}`;
  return new AgentAuthError(code, description, response.status);
};

export const fetchJson = async <T>(
  fetchImpl: FetchLike,
  url: string,
  label: string,
  options: Pick<FetchOptions, "allowPrivateNetworks"> = {},
): Promise<T> => {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertAllowedUrl(current, label, options);
    const response = await fetchImpl(current, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json" },
    });

    if (
      response.type === "opaqueredirect" ||
      REDIRECT_STATUSES.has(response.status)
    ) {
      const location = response.headers.get("location");
      if (!location) {
        throw new AgentAuthError(
          "redirect_blocked",
          `${label} redirected but the destination could not be read`,
          response.status,
        );
      }
      try {
        current = new URL(location, current).toString();
      } catch (cause) {
        throw new AgentAuthError(
          "redirect_blocked",
          `${label} redirected to an invalid URL`,
          response.status,
          { cause },
        );
      }
      continue;
    }

    if (response.url) assertAllowedUrl(response.url, label, options);
    if (!response.ok) {
      throw await toOAuthError(response, label);
    }
    return readJson<T>(response, label);
  }
  throw new AgentAuthError(
    "too_many_redirects",
    `${label} exceeded ${MAX_REDIRECTS} redirects`,
  );
};

export const postForm = async (
  fetchImpl: FetchLike,
  url: string,
  params: Record<string, string | undefined>,
): Promise<Response> => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.set(key, value);
  }
  return fetchImpl(url, {
    method: "POST",
    redirect: "error",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
};

export const postJson = async (
  fetchImpl: FetchLike,
  url: string,
  body: unknown,
): Promise<Response> =>
  fetchImpl(url, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
