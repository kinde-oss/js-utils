import { AgentAuthError } from "./errors";
import type { FetchLike } from "./types";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const resolveFetch = (custom?: FetchLike): FetchLike => {
  const impl = custom ?? globalThis.fetch;
  if (typeof impl !== "function") {
    throw new AgentAuthError("fetch_unavailable", "No fetch implementation");
  }
  return impl;
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

export const normalizeScope = (scope?: string | string[]): string[] => {
  if (!scope) return [];
  const parts = Array.isArray(scope) ? scope : scope.split(/\s+/);
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
): Promise<T> => {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw await toOAuthError(response, label);
  }
  return readJson<T>(response, label);
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
