import { AgentAuthError } from "./errors";
import type { FetchLike, FetchOptions } from "./types";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const NULL_BODY_STATUSES = new Set([204, 205, 304]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const PRIVATE_SUFFIXES = [
  ".localhost",
  ".local",
  ".localdomain",
  ".internal",
  ".home.arpa",
];

const isReactNative = (): boolean =>
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

export const resolveFetch = (custom?: FetchLike): FetchLike => {
  if (!custom && isReactNative()) {
    throw new AgentAuthError(
      "unsupported_transport",
      "The default React Native fetch follows redirects before JavaScript can validate them. Pass a fetch implementation that honors redirect: manual and redirect: error.",
    );
  }
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

export const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

export const normalizeScope = (scope?: string | string[]): string[] => {
  if (!scope) return [];
  const parts = (Array.isArray(scope) ? scope : [scope]).flatMap((s) =>
    s.split(/\s+/),
  );
  return [...new Set(parts.map((s) => s.trim()).filter(Boolean))];
};

export const assertResourceIdentifier = (value: string): void => {
  const url = parseUrl(value, "resource");
  if (url.hash || value.includes("#")) {
    throw new AgentAuthError(
      "invalid_url",
      "resource must not contain a fragment",
    );
  }
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

type LimitOptions = Pick<
  FetchOptions,
  "allowPrivateNetworks" | "timeoutMs" | "maxResponseBytes"
>;

const deadlineExceeded = (cause?: unknown) =>
  new AgentAuthError(
    "request_timeout",
    "Request exceeded its deadline",
    undefined,
    cause === undefined ? undefined : { cause },
  );

const deadlines = new WeakMap<
  AbortSignal,
  { expiresAt: number; abort: () => void }
>();

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const isExpired = (signal: AbortSignal): boolean => {
  const deadline = deadlines.get(signal);
  if (!signal.aborted && deadline && now() >= deadline.expiresAt) {
    deadline.abort();
  }
  return signal.aborted;
};

const throwIfExpired = (signal: AbortSignal): void => {
  if (isExpired(signal)) throw deadlineExceeded();
};

const discardBody = (response: Response): void => {
  try {
    response.body?.cancel().catch(() => undefined);
  } catch {
    return;
  }
};

const throwIfExpiredFor = (signal: AbortSignal, response: Response): void => {
  if (isExpired(signal)) {
    discardBody(response);
    throw deadlineExceeded();
  }
};

const withDeadline = <T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    deadlines.set(controller.signal, {
      expiresAt: now() + timeoutMs,
      abort: () => controller.abort(),
    });
    const timer = setTimeout(() => {
      controller.abort();
      reject(
        new AgentAuthError(
          "request_timeout",
          `Request exceeded ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);
    run(controller.signal)
      .then(resolve, (error) =>
        reject(controller.signal.aborted ? deadlineExceeded(error) : error),
      )
      .finally(() => clearTimeout(timer));
  });

const tooLarge = (maxBytes: number) =>
  new AgentAuthError(
    "response_too_large",
    `Response exceeded ${maxBytes} bytes`,
  );

const decodeUtf8Lossy = (bytes: Uint8Array): string => {
  let out = "";
  let codePoint = 0;
  let needed = 0;
  let seen = 0;
  let lower = 0x80;
  let upper = 0xbf;

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (needed === 0) {
      if (byte <= 0x7f) {
        out += String.fromCharCode(byte);
      } else if (byte >= 0xc2 && byte <= 0xdf) {
        needed = 1;
        codePoint = byte & 0x1f;
      } else if (byte >= 0xe0 && byte <= 0xef) {
        if (byte === 0xe0) lower = 0xa0;
        if (byte === 0xed) upper = 0x9f;
        needed = 2;
        codePoint = byte & 0x0f;
      } else if (byte >= 0xf0 && byte <= 0xf4) {
        if (byte === 0xf0) lower = 0x90;
        if (byte === 0xf4) upper = 0x8f;
        needed = 3;
        codePoint = byte & 0x07;
      } else {
        out += "\uFFFD";
      }
      continue;
    }
    if (byte < lower || byte > upper) {
      codePoint = 0;
      needed = 0;
      seen = 0;
      lower = 0x80;
      upper = 0xbf;
      out += "\uFFFD";
      i--;
      continue;
    }
    lower = 0x80;
    upper = 0xbf;
    codePoint = (codePoint << 6) | (byte & 0x3f);
    seen++;
    if (seen === needed) {
      out += String.fromCodePoint(codePoint);
      codePoint = 0;
      needed = 0;
      seen = 0;
    }
  }
  if (needed !== 0) out += "\uFFFD";
  return out.charCodeAt(0) === 0xfeff ? out.slice(1) : out;
};

const decodeUtf8 = (bytes: Uint8Array, strict = true): string => {
  if (!strict) {
    return typeof TextDecoder !== "undefined"
      ? new TextDecoder("utf-8").decode(bytes)
      : decodeUtf8Lossy(bytes);
  }
  try {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    const percentEncoded = Array.from(
      bytes,
      (byte) => `%${byte.toString(16).padStart(2, "0")}`,
    ).join("");
    return decodeURIComponent(percentEncoded).replace(/^\uFEFF/, "");
  } catch (cause) {
    throw new AgentAuthError(
      "invalid_response",
      "Response body is not valid UTF-8",
      undefined,
      { cause },
    );
  }
};

const bufferResponse = async (
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Response> => {
  throwIfExpiredFor(signal, response);
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    discardBody(response);
    throw tooLarge(maxBytes);
  }

  let bytes: Uint8Array;
  if (response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    const cancelReader = () => {
      reader.cancel().catch(() => undefined);
    };
    signal.addEventListener("abort", cancelReader, { once: true });
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (isExpired(signal)) {
          cancelReader();
          throw deadlineExceeded();
        }
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          cancelReader();
          throw tooLarge(maxBytes);
        }
        chunks.push(value);
      }
    } finally {
      signal.removeEventListener("abort", cancelReader);
    }
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } else {
    bytes = new Uint8Array(await response.arrayBuffer());
    throwIfExpired(signal);
    if (bytes.byteLength > maxBytes) throw tooLarge(maxBytes);
  }

  const text = NULL_BODY_STATUSES.has(response.status)
    ? null
    : decodeUtf8(bytes, response.ok);
  throwIfExpired(signal);
  return new Response(text, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

export const fetchJson = async <T>(
  fetchImpl: FetchLike,
  url: string,
  label: string,
  options: LimitOptions = {},
): Promise<T> => {
  const maxBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  return withDeadline(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    async (signal) => {
      let current = url;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        throwIfExpired(signal);
        assertAllowedUrl(current, label, options);
        const response = await fetchImpl(current, {
          method: "GET",
          redirect: "manual",
          signal,
          headers: { Accept: "application/json" },
        });
        throwIfExpiredFor(signal, response);

        if (
          response.type === "opaqueredirect" ||
          REDIRECT_STATUSES.has(response.status)
        ) {
          const location = response.headers.get("location");
          discardBody(response);
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
        const buffered = await bufferResponse(response, maxBytes, signal);
        if (!buffered.ok) {
          const error = await toOAuthError(buffered, label);
          throwIfExpired(signal);
          throw error;
        }
        const parsed = await readJson<T>(buffered, label);
        throwIfExpired(signal);
        return parsed;
      }
      throw new AgentAuthError(
        "too_many_redirects",
        `${label} exceeded ${MAX_REDIRECTS} redirects`,
      );
    },
  );
};

type PostOptions = Pick<FetchOptions, "timeoutMs" | "maxResponseBytes"> & {
  discardSuccessBody?: boolean;
};

const post = (
  fetchImpl: FetchLike,
  url: string,
  headers: Record<string, string>,
  body: string,
  options: PostOptions,
): Promise<Response> =>
  withDeadline(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, async (signal) => {
    const response = await fetchImpl(url, {
      method: "POST",
      redirect: "error",
      signal,
      headers,
      body,
    });
    throwIfExpiredFor(signal, response);
    if (options.discardSuccessBody && response.ok) {
      discardBody(response);
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    return bufferResponse(
      response,
      options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
      signal,
    );
  });

export const postForm = async (
  fetchImpl: FetchLike,
  url: string,
  params: Record<string, string | undefined>,
  options: PostOptions = {},
): Promise<Response> => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.set(key, value);
  }
  return post(
    fetchImpl,
    url,
    {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body.toString(),
    options,
  );
};

export const postJson = async (
  fetchImpl: FetchLike,
  url: string,
  body: unknown,
  options: PostOptions = {},
): Promise<Response> =>
  post(
    fetchImpl,
    url,
    { "Content-Type": "application/json", Accept: "application/json" },
    JSON.stringify(body),
    options,
  );
