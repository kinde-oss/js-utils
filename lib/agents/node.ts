import { lookup as dnsLookup } from "node:dns";
import type { LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import type {
  ClientRequest,
  IncomingHttpHeaders,
  IncomingMessage,
} from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { types } from "node:util";
import { AgentAuthError } from "./errors";
import { isPrivateHost } from "./http";
import type { FetchLike } from "./types";

export interface SafeFetchOptions {
  allowPrivateNetworks?: boolean;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRequestBytes?: number;
  maxRedirects?: number;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const NULL_BODY_STATUSES = new Set([204, 205, 304]);
const CREDENTIAL_HEADERS = ["authorization", "proxy-authorization", "cookie"];

const toResponseHeaders = (headers: IncomingHttpHeaders): Headers => {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((v) => result.append(name, v));
    } else if (value !== undefined) {
      result.set(name, value);
    }
  }
  return result;
};

const streamIncoming = (
  incoming: IncomingMessage,
  maxBytes: number,
  onFinish: () => void,
  registerTimeout: (handler: (error: Error) => void) => void,
): ReadableStream<Uint8Array> => {
  let received = 0;
  let finished = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const finish = () => {
        finished = true;
        onFinish();
      };
      registerTimeout((error) => {
        if (finished) return;
        finish();
        controller.error(error);
        incoming.destroy();
      });
      incoming.on("data", (chunk: Buffer) => {
        if (finished) return;
        received += chunk.byteLength;
        if (received > maxBytes) {
          finish();
          controller.error(
            new AgentAuthError(
              "response_too_large",
              `Response exceeded ${maxBytes} bytes`,
            ),
          );
          incoming.destroy();
          return;
        }
        controller.enqueue(new Uint8Array(chunk));
      });
      incoming.on("end", () => {
        if (finished) return;
        finish();
        controller.close();
      });
      incoming.on("error", (error) => {
        if (finished) return;
        finish();
        controller.error(error);
      });
    },
    cancel() {
      finished = true;
      onFinish();
      incoming.destroy();
    },
  });
};

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

const readRequestBody = async (
  request: Request,
  maxBytes: number,
  timeoutMs: number,
  signal: AbortSignal | null | undefined,
): Promise<Buffer> => {
  const reader = (request.body as ReadableStream<Uint8Array>).getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;

  const guard = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new AgentAuthError(
            "request_timeout",
            `Reading the request body exceeded ${timeoutMs}ms`,
          ),
        ),
      timeoutMs,
    );
    if (signal) {
      onAbort = () =>
        reject(
          new AgentAuthError(
            "request_aborted",
            "The request was aborted",
            undefined,
            { cause: signal.reason },
          ),
        );
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
  });

  const startedAt = performance.now();
  const pump = (async () => {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      if (signal?.aborted) {
        throw new AgentAuthError(
          "request_aborted",
          "The request was aborted",
          undefined,
          { cause: signal.reason },
        );
      }
      if (performance.now() - startedAt >= timeoutMs) {
        throw new AgentAuthError(
          "request_timeout",
          `Reading the request body exceeded ${timeoutMs}ms`,
        );
      }
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks);
      if (!types.isUint8Array(value)) {
        throw new AgentAuthError(
          "invalid_request_body",
          "The request body stream produced a chunk that is not a Uint8Array",
        );
      }
      if (value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new AgentAuthError(
          "request_too_large",
          `Request body exceeded ${maxBytes} bytes`,
        );
      }
      chunks.push(value);
    }
  })();
  pump.catch(() => undefined);

  try {
    return await Promise.race([pump, guard]);
  } finally {
    clearTimeout(timer);
    if (signal && onAbort) signal.removeEventListener("abort", onAbort);
    reader.cancel().catch(() => undefined);
  }
};

export const createSafeFetch = (options: SafeFetchOptions = {}): FetchLike => {
  const allowPrivateNetworks = options.allowPrivateNetworks === true;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxResponseBytes = options.maxResponseBytes ?? 1_048_576;
  const maxRequestBytes = options.maxRequestBytes ?? 1_048_576;
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
    discardRedirectBody: boolean,
    streamSuccess: boolean,
  ): Promise<Response> =>
    new Promise<Response>((resolve, reject) => {
      let streamTimeout: ((error: Error) => void) | undefined;
      const timer = setTimeout(() => {
        const error = new AgentAuthError(
          "request_timeout",
          `Request exceeded ${timeoutMs}ms`,
        );
        if (streamTimeout) {
          streamTimeout(error);
          return;
        }
        request?.destroy(error);
        fail(error);
      }, timeoutMs);
      const succeed = (response: Response, keepTimer = false) => {
        if (!keepTimer) clearTimeout(timer);
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
            agent: false,
            headers: body
              ? { ...headers, "content-length": String(body.byteLength) }
              : headers,
            ...(signal && { signal }),
          },
          (incoming) => {
            incoming.on("error", fail);
            const responseStatus = incoming.statusCode ?? 0;
            const canCarryBody =
              method !== "HEAD" && !NULL_BODY_STATUSES.has(responseStatus);
            if (
              canCarryBody &&
              REDIRECT_STATUSES.has(responseStatus) &&
              incoming.headers.location !== undefined
            ) {
              try {
                const redirectInit = {
                  status: responseStatus,
                  statusText: incoming.statusMessage,
                  headers: toResponseHeaders(incoming.headers),
                };
                if (discardRedirectBody) {
                  const redirectResponse = new Response(null, redirectInit);
                  incoming.destroy();
                  succeed(redirectResponse);
                } else {
                  succeed(
                    new Response(
                      streamIncoming(
                        incoming,
                        maxResponseBytes,
                        () => clearTimeout(timer),
                        (handler) => {
                          streamTimeout = handler;
                        },
                      ),
                      redirectInit,
                    ),
                    true,
                  );
                }
              } catch (cause) {
                incoming.destroy();
                fail(
                  new AgentAuthError(
                    "invalid_response",
                    "Server returned a response that could not be read",
                    undefined,
                    { cause },
                  ),
                );
              }
              return;
            }
            if (
              streamSuccess &&
              canCarryBody &&
              responseStatus >= 200 &&
              responseStatus < 300
            ) {
              try {
                succeed(
                  new Response(
                    streamIncoming(
                      incoming,
                      maxResponseBytes,
                      () => clearTimeout(timer),
                      (handler) => {
                        streamTimeout = handler;
                      },
                    ),
                    {
                      status: responseStatus,
                      statusText: incoming.statusMessage,
                      headers: toResponseHeaders(incoming.headers),
                    },
                  ),
                  true,
                );
              } catch (cause) {
                incoming.destroy();
                fail(
                  new AgentAuthError(
                    "invalid_response",
                    "Server returned a response that could not be read",
                    undefined,
                    { cause },
                  ),
                );
              }
              return;
            }
            const contentEncoding = String(
              incoming.headers["content-encoding"] ?? "",
            )
              .split(",")
              .map((coding) => coding.trim().toLowerCase())
              .filter((coding) => coding && coding !== "identity");
            if (canCarryBody && contentEncoding.length) {
              incoming.destroy();
              fail(
                new AgentAuthError(
                  "unsupported_content_encoding",
                  `Server returned a ${contentEncoding.join(", ")} encoded body, which this transport does not decode`,
                ),
              );
              return;
            }
            const declared = Number(incoming.headers["content-length"]);
            if (
              canCarryBody &&
              Number.isFinite(declared) &&
              declared > maxResponseBytes
            ) {
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
                const responseHeaders = toResponseHeaders(incoming.headers);
                succeed(
                  new Response(
                    canCarryBody
                      ? (Buffer.concat(chunks) as unknown as BodyInit)
                      : null,
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
    const original =
      typeof Request !== "undefined" && input instanceof Request
        ? input
        : undefined;
    const redirect = init?.redirect ?? original?.redirect ?? "follow";
    const method = (init?.method ?? original?.method ?? "GET").toUpperCase();
    const hasBody =
      (init?.body !== undefined && init.body !== null) ||
      Boolean(original?.body);
    if (hasBody && (method === "GET" || method === "HEAD")) {
      throw new TypeError(`Request with ${method} method cannot have a body`);
    }
    let target = toUrl(input);
    assertDestination(target);
    let headers = Object.fromEntries(
      new Headers(init?.headers ?? original?.headers).entries(),
    );
    const signal = init?.signal ?? original?.signal;
    const streamSuccess =
      (init as { discardSuccessBody?: boolean } | undefined)
        ?.discardSuccessBody === true;
    let body: Buffer | undefined;
    if (init?.body !== undefined && init.body !== null) {
      body = toBody(init.body);
      if (!("content-type" in headers)) {
        if (init.body instanceof URLSearchParams) {
          headers = {
            ...headers,
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          };
        } else if (typeof init.body === "string") {
          headers = { ...headers, "content-type": "text/plain;charset=UTF-8" };
        }
      }
    } else if (original?.body) {
      body = await readRequestBody(
        original,
        maxRequestBytes,
        timeoutMs,
        signal,
      );
    }
    if (!("accept-encoding" in headers)) {
      headers = { ...headers, "accept-encoding": "identity" };
    }
    if (body && body.byteLength > maxRequestBytes) {
      throw new AgentAuthError(
        "request_too_large",
        `Request body exceeded ${maxRequestBytes} bytes`,
      );
    }

    for (let hop = 0; hop <= maxRedirects; hop++) {
      assertDestination(target);
      const response = await send(
        target,
        method,
        headers,
        body,
        signal,
        redirect !== "manual",
        streamSuccess,
      );

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
        const next = new URL(location, target);
        if (next.origin !== target.origin) {
          headers = Object.fromEntries(
            Object.entries(headers).filter(
              ([name]) => !CREDENTIAL_HEADERS.includes(name.toLowerCase()),
            ),
          );
        }
        target = next;
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
