import { lookup as dnsLookup } from "node:dns";
import type { LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import type { ClientRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { AgentAuthError } from "./errors";
import { isPrivateHost } from "./http";
import type { FetchLike } from "./types";

export interface SafeFetchOptions {
  allowPrivateNetworks?: boolean;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

const isBlockedAddress = (entry: LookupAddress): boolean => {
  try {
    const host =
      entry.family === 6
        ? new URL(`http://[${entry.address}]/`).hostname
        : entry.address;
    return isPrivateHost(host);
  } catch {
    return true;
  }
};

const createLookup =
  (allowPrivateNetworks: boolean): LookupFunction =>
  (hostname, options, callback) => {
    dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) {
        callback(error, "", 0);
        return;
      }
      if (!allowPrivateNetworks && addresses.some(isBlockedAddress)) {
        callback(
          new AgentAuthError(
            "private_network_blocked",
            `${hostname} resolves to a private or local address`,
          ) as NodeJS.ErrnoException,
          "",
          0,
        );
        return;
      }
      if (options.all) {
        callback(null, addresses);
      } else {
        callback(null, addresses[0].address, addresses[0].family);
      }
    });
  };

const toUrl = (input: RequestInfo | URL): URL => {
  if (input instanceof URL) return new URL(input.href);
  const value = typeof input === "string" ? input : input.url;
  try {
    return new URL(value);
  } catch (cause) {
    throw new AgentAuthError(
      "invalid_url",
      "Request URL is not valid",
      undefined,
      {
        cause,
      },
    );
  }
};

const toBody = (body: BodyInit | null | undefined): Buffer | undefined => {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return Buffer.from(body);
  if (body instanceof URLSearchParams) return Buffer.from(body.toString());
  if (body instanceof Uint8Array) return Buffer.from(body);
  throw new TypeError(
    "createSafeFetch supports string, URLSearchParams and Uint8Array bodies",
  );
};

export const createSafeFetch = (options: SafeFetchOptions = {}): FetchLike => {
  const allowPrivateNetworks = options.allowPrivateNetworks === true;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxResponseBytes = options.maxResponseBytes ?? 1_048_576;
  const maxRedirects = options.maxRedirects ?? 5;
  const lookup = createLookup(allowPrivateNetworks);

  const assertDestination = (target: URL): void => {
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      throw new AgentAuthError(
        "invalid_url",
        "Only http and https are supported",
      );
    }
    if (!allowPrivateNetworks && isPrivateHost(target.hostname)) {
      throw new AgentAuthError(
        "private_network_blocked",
        `${target.hostname} is a private or local address`,
      );
    }
  };

  const send = (
    target: URL,
    method: string,
    headers: Record<string, string>,
    body: Buffer | undefined,
    signal: AbortSignal | null | undefined,
  ): Promise<Response> =>
    new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new AgentAuthError(
          "request_timeout",
          `Request exceeded ${timeoutMs}ms`,
        );
        request?.destroy(error);
        fail(error);
      }, timeoutMs);
      const succeed = (response: Response) => {
        clearTimeout(timer);
        resolve(response);
      };
      const fail = (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      };
      let request: ClientRequest | undefined;

      const requestFn =
        target.protocol === "https:" ? httpsRequest : httpRequest;
      try {
        request = requestFn(
          target,
          {
            method,
            lookup,
            headers: body
              ? { ...headers, "content-length": String(body.byteLength) }
              : headers,
            ...(signal && { signal }),
          },
          (incoming) => {
            const declared = Number(incoming.headers["content-length"]);
            if (Number.isFinite(declared) && declared > maxResponseBytes) {
              incoming.destroy();
              fail(
                new AgentAuthError(
                  "response_too_large",
                  `Response exceeded ${maxResponseBytes} bytes`,
                ),
              );
              return;
            }

            const chunks: Buffer[] = [];
            let received = 0;
            incoming.on("data", (chunk: Buffer) => {
              received += chunk.byteLength;
              if (received > maxResponseBytes) {
                incoming.destroy();
                fail(
                  new AgentAuthError(
                    "response_too_large",
                    `Response exceeded ${maxResponseBytes} bytes`,
                  ),
                );
                return;
              }
              chunks.push(chunk);
            });
            incoming.on("error", fail);
            incoming.on("end", () => {
              try {
                const status = incoming.statusCode ?? 0;
                if (status < 200 || status > 599) {
                  throw new AgentAuthError(
                    "invalid_response",
                    `Server returned an unsupported status code ${status}`,
                    status,
                  );
                }
                const responseHeaders = new Headers();
                for (const [name, value] of Object.entries(incoming.headers)) {
                  if (Array.isArray(value)) {
                    value.forEach((v) => responseHeaders.append(name, v));
                  } else if (value !== undefined) {
                    responseHeaders.set(name, value);
                  }
                }
                succeed(
                  new Response(
                    NULL_BODY_STATUSES.has(status)
                      ? null
                      : (Buffer.concat(chunks) as unknown as BodyInit),
                    {
                      status,
                      statusText: incoming.statusMessage,
                      headers: responseHeaders,
                    },
                  ),
                );
              } catch (cause) {
                fail(
                  cause instanceof AgentAuthError
                    ? cause
                    : new AgentAuthError(
                        "invalid_response",
                        "Server returned a response that could not be read",
                        undefined,
                        { cause },
                      ),
                );
              }
            });
          },
        );
      } catch (error) {
        fail(error);
        return;
      }

      request.on("error", fail);
      if (body) request.write(body);
      request.end();
    });

  return async (input, init) => {
    const redirect = init?.redirect ?? "follow";
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = toBody(init?.body);
    let target = toUrl(input);

    for (let hop = 0; hop <= maxRedirects; hop++) {
      assertDestination(target);
      const response = await send(target, method, headers, body, init?.signal);

      if (!REDIRECT_STATUSES.has(response.status) || redirect === "manual") {
        return response;
      }
      if (redirect === "error") {
        throw new AgentAuthError(
          "redirect_blocked",
          `Request to ${target.origin} was redirected`,
          response.status,
        );
      }
      if (method !== "GET" && method !== "HEAD") {
        throw new AgentAuthError(
          "redirect_blocked",
          `${method} request was redirected`,
          response.status,
        );
      }
      const location = response.headers.get("location");
      if (!location) return response;
      try {
        target = new URL(location, target);
      } catch (cause) {
        throw new AgentAuthError(
          "redirect_blocked",
          "Redirected to an invalid URL",
          response.status,
          { cause },
        );
      }
    }
    throw new AgentAuthError(
      "too_many_redirects",
      `Exceeded ${maxRedirects} redirects`,
    );
  };
};
