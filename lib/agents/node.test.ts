import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer as createNetServer } from "node:net";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { runInNewContext } from "node:vm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const resolutions = vi.hoisted(
  () => new Map<string, { address: string; family: number }[]>(),
);
const lookupSpy = vi.hoisted(() => vi.fn());

vi.mock("node:dns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:dns")>();
  const lookup = (
    hostname: string,
    options: { all?: boolean },
    callback: (error: Error | null, result: unknown, family?: number) => void,
  ) => {
    lookupSpy(hostname);
    const entries = resolutions.get(hostname);
    if (!entries) {
      (actual.lookup as unknown as (...args: unknown[]) => void)(
        hostname,
        options,
        callback,
      );
      return;
    }
    if (options.all) callback(null, entries);
    else callback(null, entries[0].address, entries[0].family);
  };
  return { ...actual, default: { ...actual, lookup }, lookup };
});

import { AgentAuthError } from "./errors";
import { discoverAgentAuth } from "./discovery";
import { fetchJson } from "./http";
import { revokeToken } from "./token";
import { createSafeFetch } from "./node";

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
) => void;

let server: Server;
let port: number;
let handler: Handler;

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => handler(req, res, Buffer.concat(chunks).toString()));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(() => {
  resolutions.clear();
  lookupSpy.mockClear();
});

const resolveTo = (hostname: string, ...addresses: [string, number][]) =>
  resolutions.set(
    hostname,
    addresses.map(([address, family]) => ({ address, family })),
  );

describe("createSafeFetch destination policy", () => {
  it.each([
    ["10.0.0.5", [["10.0.0.5", 4]]],
    ["loopback", [["127.0.0.1", 4]]],
    ["metadata", [["169.254.169.254", 4]]],
    ["ipv6 loopback", [["::1", 6]]],
    ["ipv6 unique-local", [["fd12:3456::1", 6]]],
    ["ipv4-mapped ipv6", [["::ffff:10.0.0.5", 6]]],
    [
      "mixed public and private",
      [
        ["93.184.216.34", 4],
        ["10.0.0.5", 4],
      ],
    ],
  ] as [string, [string, number][]][])(
    "blocks a normal-looking name that resolves to %s",
    async (_label, addresses) => {
      resolveTo("rebind.example.com", ...addresses);
      const result = createSafeFetch()("https://rebind.example.com/meta");
      await expect(result).rejects.toBeInstanceOf(AgentAuthError);
      await expect(result).rejects.toMatchObject({
        code: "private_network_blocked",
      });
      expect(lookupSpy).toHaveBeenCalledWith("rebind.example.com");
    },
  );

  it.each([
    "http://10.0.0.5/",
    "http://[::1]/",
    "https://metadata.internal/",
    "http://localhost:1/",
  ])("blocks %s before any DNS lookup", async (url) => {
    await expect(createSafeFetch()(url)).rejects.toMatchObject({
      code: "private_network_blocked",
    });
    expect(lookupSpy).not.toHaveBeenCalled();
  });

  it("rejects unsupported protocols", async () => {
    await expect(createSafeFetch()("ftp://example.com/")).rejects.toMatchObject(
      {
        code: "invalid_url",
      },
    );
  });

  it("is used by discovery so a rebinding metadata url is refused", async () => {
    resolveTo("rebind.example.com", ["10.0.0.5", 4]);
    await expect(
      discoverAgentAuth({
        wwwAuthenticate:
          'Bearer resource_metadata="https://rebind.example.com/meta"',
        resourceUrl: "https://api.example.com/mcp",
        fetch: createSafeFetch(),
      }),
    ).rejects.toMatchObject({
      code: "metadata_unavailable",
      cause: { code: "private_network_blocked" },
    });
  });
});

describe("createSafeFetch transport", () => {
  const options = { allowPrivateNetworks: true };

  it("connects to the validated address and keeps the original Host", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    let seenHost = "";
    handler = (req, res) => {
      seenHost = req.headers.host ?? "";
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    };
    const response = await createSafeFetch(options)(
      `http://pinned.example.com:${port}/meta`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(seenHost).toBe(`pinned.example.com:${port}`);
    expect(lookupSpy).toHaveBeenCalledWith("pinned.example.com");
  });

  it("sends the method, headers and form body", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    let seen = { method: "", type: "", body: "", length: "" };
    handler = (req, res, body) => {
      seen = {
        method: req.method ?? "",
        type: String(req.headers["content-type"]),
        body,
        length: String(req.headers["content-length"]),
      };
      res.statusCode = 201;
      res.end("created");
    };
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      scope: "a b",
    });
    const response = await createSafeFetch(options)(
      `http://pinned.example.com:${port}/token`,
      {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
    );
    expect(response.status).toBe(201);
    expect(await response.text()).toBe("created");
    expect(seen).toEqual({
      method: "POST",
      type: "application/x-www-form-urlencoded",
      body: body.toString(),
      length: String(Buffer.byteLength(body.toString())),
    });
  });

  describe("Request inputs", () => {
    const record = () => {
      const seen: {
        method: string;
        headers: Record<string, string | string[] | undefined>;
        body: string;
      }[] = [];
      handler = (req, res, body) => {
        seen.push({ method: req.method ?? "", headers: req.headers, body });
        res.end("ok");
      };
      return seen;
    };

    it("preserves the method, headers and body of a Request without init", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const request = new Request(`http://pinned.example.com:${port}/token`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-trace": "abc" },
        body: JSON.stringify({ a: 1 }),
      });
      const response = await createSafeFetch(options)(request);
      expect(await response.text()).toBe("ok");
      expect(seen).toHaveLength(1);
      expect(seen[0].method).toBe("POST");
      expect(seen[0].headers["x-trace"]).toBe("abc");
      expect(seen[0].headers["content-type"]).toBe("application/json");
      expect(seen[0].body).toBe('{"a":1}');
      expect(seen[0].headers["content-length"]).toBe(
        String(Buffer.byteLength('{"a":1}')),
      );
    });

    it("lets init override the properties of a Request", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const request = new Request(`http://pinned.example.com:${port}/`, {
        method: "POST",
        headers: { "x-from": "request" },
        body: "from-request",
      });
      await createSafeFetch(options)(request, {
        headers: { "x-from": "init" },
        body: "from-init",
      });
      expect(seen[0].method).toBe("POST");
      expect(seen[0].headers["x-from"]).toBe("init");
      expect(seen[0].body).toBe("from-init");
    });

    it("sends a form content type for a URLSearchParams body", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      await createSafeFetch(options)(
        `http://pinned.example.com:${port}/token`,
        {
          method: "POST",
          body: new URLSearchParams({ grant_type: "refresh_token", a: "b c" }),
        },
      );
      expect(seen[0].headers["content-type"]).toBe(
        "application/x-www-form-urlencoded;charset=UTF-8",
      );
      expect(seen[0].body).toBe("grant_type=refresh_token&a=b+c");
    });

    it("sends a text content type for a string body", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      await createSafeFetch(options)(`http://pinned.example.com:${port}/`, {
        method: "POST",
        body: "plain",
      });
      expect(seen[0].headers["content-type"]).toBe("text/plain;charset=UTF-8");
    });

    it.each([
      ["Content-Type", "application/json"],
      ["content-type", "application/json"],
      ["CONTENT-TYPE", "application/vnd.custom+json"],
    ])("keeps a caller-supplied %s", async (name, value) => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      await createSafeFetch(options)(`http://pinned.example.com:${port}/`, {
        method: "POST",
        headers: { [name]: value },
        body: new URLSearchParams({ a: "1" }),
      });
      expect(seen[0].headers["content-type"]).toBe(value);
    });

    it("does not invent a content type for a binary body or no body", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const safe = createSafeFetch(options);
      await safe(`http://pinned.example.com:${port}/`, {
        method: "POST",
        body: new Uint8Array([1, 2, 3]),
      });
      await safe(`http://pinned.example.com:${port}/`);
      expect(seen[0].headers["content-type"]).toBeUndefined();
      expect(seen[1].headers["content-type"]).toBeUndefined();
    });

    it("keeps the content type of a Request built from URLSearchParams", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      await createSafeFetch(options)(
        new Request(`http://pinned.example.com:${port}/token`, {
          method: "POST",
          body: new URLSearchParams({ a: "1" }),
        }),
      );
      expect(seen[0].headers["content-type"]).toBe(
        "application/x-www-form-urlencoded;charset=UTF-8",
      );
      expect(seen[0].body).toBe("a=1");
    });

    it("keeps URL plus init behaviour unchanged", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      await createSafeFetch(options)(`http://pinned.example.com:${port}/`, {
        method: "POST",
        headers: { "x-a": "1" },
        body: "body",
      });
      expect(seen[0].method).toBe("POST");
      expect(seen[0].headers["x-a"]).toBe("1");
      expect(seen[0].body).toBe("body");
    });

    it("uses the redirect policy of a Request", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      handler = (_req, res) => {
        res.statusCode = 302;
        res.setHeader("location", "/elsewhere");
        res.end();
      };
      const response = await createSafeFetch(options)(
        new Request(`http://pinned.example.com:${port}/`, {
          redirect: "manual",
        }),
      );
      expect(response.status).toBe(302);
    });

    it.each(["GET", "HEAD"])(
      "rejects a %s override of a Request that has a body, before sending anything",
      async (method) => {
        resolveTo("pinned.example.com", ["127.0.0.1", 4]);
        const seen = record();
        const request = new Request(`http://pinned.example.com:${port}/`, {
          method: "POST",
          body: "payload",
        });
        await expect(
          createSafeFetch(options)(request, { method }),
        ).rejects.toBeInstanceOf(TypeError);
        expect(seen).toHaveLength(0);
        expect(lookupSpy).not.toHaveBeenCalled();
        expect(request.bodyUsed).toBe(false);
      },
    );

    it.each(["GET", "HEAD"])(
      "rejects a %s request given an init body, as fetch does",
      async (method) => {
        resolveTo("pinned.example.com", ["127.0.0.1", 4]);
        const seen = record();
        await expect(
          createSafeFetch(options)(`http://pinned.example.com:${port}/`, {
            method,
            body: "payload",
          }),
        ).rejects.toBeInstanceOf(TypeError);
        expect(seen).toHaveLength(0);
      },
    );

    it("rejects a GET override even when init supplies a replacement body", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const request = new Request(`http://pinned.example.com:${port}/`, {
        method: "POST",
        body: "from-request",
      });
      await expect(
        createSafeFetch(options)(request, { method: "GET", body: "other" }),
      ).rejects.toBeInstanceOf(TypeError);
      expect(seen).toHaveLength(0);
    });

    it("still accepts bodyless GET and HEAD requests and replacement bodies", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const safe = createSafeFetch(options);
      const url = `http://pinned.example.com:${port}/`;
      await safe(url, { method: "GET" });
      await safe(url, { method: "HEAD" });
      await safe(url, { method: "GET", body: null });
      await safe(new Request(url, { method: "POST", body: "old" }), {
        body: "new",
      });
      await safe(new Request(url, { method: "POST", body: "kept" }), {
        method: "PUT",
      });
      expect(seen.map((entry) => entry.method)).toEqual([
        "GET",
        "HEAD",
        "GET",
        "POST",
        "PUT",
      ]);
      expect(seen[3].body).toBe("new");
      expect(seen[4].body).toBe("kept");
    });

    it("sends a GET Request without a body", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      await createSafeFetch(options)(
        new Request(`http://pinned.example.com:${port}/`, {
          headers: { "x-get": "1" },
        }),
      );
      expect(seen[0].method).toBe("GET");
      expect(seen[0].headers["x-get"]).toBe("1");
      expect(seen[0].body).toBe("");
    });
  });

  describe("Request body bounds", () => {
    const record = () => {
      const seen: { method: string; body: string }[] = [];
      handler = (req, res, body) => {
        seen.push({ method: req.method ?? "", body });
        res.end("ok");
      };
      return seen;
    };

    const streamRequest = (
      url: string,
      stream: ReadableStream<Uint8Array>,
    ): Request =>
      new Request(url, {
        method: "POST",
        body: stream,
        duplex: "half",
      } as RequestInit);

    const neverClosing = () =>
      new ReadableStream<Uint8Array>({ start: () => undefined });

    const bytes = (size: number) => new Uint8Array(size).fill(120);

    it("validates the destination before reading the body", async () => {
      const request = streamRequest("http://10.0.0.5/", neverClosing());
      const getReader = vi.spyOn(request.body as ReadableStream, "getReader");
      await expect(createSafeFetch()(request)).rejects.toMatchObject({
        code: "private_network_blocked",
      });
      expect(getReader).not.toHaveBeenCalled();
      expect(request.bodyUsed).toBe(false);
    });

    it("times out when the body stream never closes, without contacting the server", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const started = Date.now();
      await expect(
        createSafeFetch({ ...options, timeoutMs: 60 })(
          streamRequest(`http://pinned.example.com:${port}/`, neverClosing()),
        ),
      ).rejects.toMatchObject({ code: "request_timeout" });
      expect(Date.now() - started).toBeLessThan(1500);
      expect(seen).toHaveLength(0);
    });

    it("stops reading when the caller aborts", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 30);
      const started = Date.now();
      await expect(
        createSafeFetch({ ...options, timeoutMs: 5000 })(
          streamRequest(`http://pinned.example.com:${port}/`, neverClosing()),
          { signal: controller.signal },
        ),
      ).rejects.toMatchObject({ code: "request_aborted" });
      expect(Date.now() - started).toBeLessThan(1500);
      expect(seen).toHaveLength(0);
    });

    it("rejects immediately when the signal is already aborted", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const controller = new AbortController();
      controller.abort();
      await expect(
        createSafeFetch({ ...options, timeoutMs: 5000 })(
          streamRequest(`http://pinned.example.com:${port}/`, neverClosing()),
          { signal: controller.signal },
        ),
      ).rejects.toMatchObject({ code: "request_aborted" });
      expect(seen).toHaveLength(0);
    });

    it("enforces an upload limit on streamed Request bodies", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(bytes(600));
        },
      });
      await expect(
        createSafeFetch({ ...options, maxRequestBytes: 1000 })(
          streamRequest(`http://pinned.example.com:${port}/`, body),
        ),
      ).rejects.toMatchObject({ code: "request_too_large" });
      expect(seen).toHaveLength(0);
    });

    it("enforces the upload limit on init bodies and Request bodies alike", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const safe = createSafeFetch({ ...options, maxRequestBytes: 1000 });
      const url = `http://pinned.example.com:${port}/`;
      await expect(
        safe(url, { method: "POST", body: "x".repeat(1001) }),
      ).rejects.toMatchObject({ code: "request_too_large" });
      await expect(
        safe(new Request(url, { method: "POST", body: "x".repeat(1001) })),
      ).rejects.toMatchObject({ code: "request_too_large" });
      await safe(url, { method: "POST", body: "x".repeat(1000) });
      expect(seen).toHaveLength(1);
      expect(seen[0].body).toHaveLength(1000);
    });

    it.each([
      ["a string", "not bytes"],
      ["a number", 42],
      ["an object", { a: 1 }],
      ["an ArrayBuffer", new ArrayBuffer(8)],
      ["null", null],
    ])(
      "rejects a body stream that yields %s with an AgentAuthError",
      async (_label, chunk) => {
        resolveTo("pinned.example.com", ["127.0.0.1", 4]);
        const seen = record();
        const body = new ReadableStream<unknown>({
          start(controller) {
            controller.enqueue(chunk);
            controller.close();
          },
        }) as unknown as ReadableStream<Uint8Array>;
        const result = createSafeFetch({ ...options, maxRequestBytes: 1000 })(
          streamRequest(`http://pinned.example.com:${port}/`, body),
        );
        await expect(result).rejects.toBeInstanceOf(AgentAuthError);
        await expect(result).rejects.toMatchObject({
          code: "invalid_request_body",
        });
        expect(seen).toHaveLength(0);
      },
    );

    it("accepts a real byte array whose display tag was changed", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const chunk = new Uint8Array([97, 98, 99]);
      Object.defineProperty(chunk, Symbol.toStringTag, { value: "Custom" });
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(chunk);
          controller.close();
        },
      });
      await createSafeFetch(options)(
        streamRequest(`http://pinned.example.com:${port}/`, body),
      );
      expect(seen).toEqual([{ method: "POST", body: "abc" }]);
    });

    it("rejects an object that only claims to be a Uint8Array", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const fake = {
        [Symbol.toStringTag]: "Uint8Array",
        byteLength: 3,
      };
      const body = new ReadableStream<unknown>({
        start(controller) {
          controller.enqueue(fake);
          controller.close();
        },
      }) as unknown as ReadableStream<Uint8Array>;
      await expect(
        createSafeFetch(options)(
          streamRequest(`http://pinned.example.com:${port}/`, body),
        ),
      ).rejects.toMatchObject({ code: "invalid_request_body" });
      expect(seen).toHaveLength(0);
    });

    it("accepts byte arrays created in another realm", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const foreign = runInNewContext(
        "new Uint8Array([100, 101])",
      ) as Uint8Array;
      expect(foreign instanceof Uint8Array).toBe(false);
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(foreign);
          controller.close();
        },
      });
      await createSafeFetch(options)(
        streamRequest(`http://pinned.example.com:${port}/`, body),
      );
      expect(seen).toEqual([{ method: "POST", body: "de" }]);
    });

    it("rejects an invalid chunk that follows valid ones", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const body = new ReadableStream<unknown>({
        start(controller) {
          controller.enqueue(bytes(10));
          controller.enqueue("late string");
          controller.close();
        },
      }) as unknown as ReadableStream<Uint8Array>;
      await expect(
        createSafeFetch(options)(
          streamRequest(`http://pinned.example.com:${port}/`, body),
        ),
      ).rejects.toMatchObject({ code: "invalid_request_body" });
      expect(seen).toHaveLength(0);
    });

    it("accepts Buffer and Uint8Array chunks and still enforces the size limit on them", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const safe = createSafeFetch({ ...options, maxRequestBytes: 1000 });
      const url = `http://pinned.example.com:${port}/`;
      await safe(
        streamRequest(
          url,
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(Buffer.from("abc"));
              controller.enqueue(new Uint8Array([100, 101]));
              controller.close();
            },
          }),
        ),
      );
      expect(seen[0].body).toBe("abcde");
      await expect(
        safe(
          streamRequest(
            url,
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(bytes(1001));
                controller.close();
              },
            }),
          ),
        ),
      ).rejects.toMatchObject({ code: "request_too_large" });
    });

    it("still sends finite streamed Request bodies", async () => {
      resolveTo("pinned.example.com", ["127.0.0.1", 4]);
      const seen = record();
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("hello "));
          controller.enqueue(encoder.encode("world"));
          controller.close();
        },
      });
      const response = await createSafeFetch(options)(
        streamRequest(`http://pinned.example.com:${port}/`, body),
      );
      expect(await response.text()).toBe("ok");
      expect(seen).toEqual([{ method: "POST", body: "hello world" }]);
    });
  });

  describe("request body read loop", () => {
    const url = () => `http://127.0.0.1:${port}/`;
    const upload = (stream: ReadableStream<Uint8Array>) =>
      new Request(url(), {
        method: "POST",
        body: stream,
        duplex: "half",
      } as RequestInit);

    it("stops a stream of endless empty chunks at the deadline", async () => {
      let pulls = 0;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          pulls += 1;
          controller.enqueue(new Uint8Array(0));
        },
      });
      handler = (_req, res) => res.end("ok");
      const startedAt = performance.now();
      await expect(
        createSafeFetch({ ...options, timeoutMs: 100 })(upload(stream)),
      ).rejects.toMatchObject({ code: "request_timeout" });
      expect(performance.now() - startedAt).toBeLessThan(2000);
      expect(pulls).toBeGreaterThan(0);
    });

    it("stops a stream of endless empty chunks when the request is cancelled", async () => {
      const controller = new AbortController();
      let pulls = 0;
      const stream = new ReadableStream<Uint8Array>({
        pull(source) {
          pulls += 1;
          if (pulls === 50) controller.abort();
          source.enqueue(new Uint8Array(0));
        },
      });
      handler = (_req, res) => res.end("ok");
      await expect(
        createSafeFetch({ ...options, timeoutMs: 5000 })(upload(stream), {
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ code: "request_aborted" });
    });

    it("sends a finite upload that contains empty chunks", async () => {
      const seen: string[] = [];
      handler = (_req, res, body) => {
        seen.push(body);
        res.end("ok");
      };
      const parts = [
        new Uint8Array(0),
        new TextEncoder().encode("ab"),
        new Uint8Array(0),
        new Uint8Array(0),
        new TextEncoder().encode("cd"),
        new Uint8Array(0),
      ];
      const stream = new ReadableStream<Uint8Array>({
        pull(source) {
          const next = parts.shift();
          if (next) source.enqueue(next);
          else source.close();
        },
      });
      const response = await createSafeFetch({
        ...options,
        maxRequestBytes: 4,
        timeoutMs: 5000,
      })(upload(stream));
      expect(await response.text()).toBe("ok");
      expect(seen).toEqual(["abcd"]);
    });

    it("does not retain empty chunks of the upload", async () => {
      handler = (_req, res) => res.end("ok");
      const parts = [
        new Uint8Array(0),
        new TextEncoder().encode("ab"),
        new Uint8Array(0),
        new TextEncoder().encode("cd"),
        new Uint8Array(0),
      ];
      const stream = new ReadableStream<Uint8Array>({
        pull(source) {
          const next = parts.shift();
          if (next) source.enqueue(next);
          else source.close();
        },
      });
      const concat = vi.spyOn(Buffer, "concat");
      try {
        await createSafeFetch({ ...options, timeoutMs: 5000 })(upload(stream));
        const lists = concat.mock.calls.map(
          ([list]) => list as readonly Uint8Array[],
        );
        expect(lists.some((list) => list.length === 2)).toBe(true);
        expect(
          lists.some((list) => list.some((chunk) => chunk.byteLength === 0)),
        ).toBe(false);
      } finally {
        concat.mockRestore();
      }
    });

    it("does not count empty chunks toward the upload limit", async () => {
      const seen: string[] = [];
      handler = (_req, res, body) => {
        seen.push(body);
        res.end("ok");
      };
      let pulls = 0;
      const stream = new ReadableStream<Uint8Array>({
        pull(source) {
          pulls += 1;
          if (pulls <= 200) source.enqueue(new Uint8Array(0));
          else if (pulls === 201) source.enqueue(new TextEncoder().encode("x"));
          else source.close();
        },
      });
      const response = await createSafeFetch({
        ...options,
        maxRequestBytes: 1,
        timeoutMs: 5000,
      })(upload(stream));
      expect(await response.text()).toBe("ok");
      expect(seen).toEqual(["x"]);
    });
  });

  describe("redirect responses with an unreadable reason phrase", () => {
    const rawServer = async (phrase: string) => {
      const raw = createNetServer((socket) => {
        socket.on("data", () => {
          socket.end(
            `HTTP/1.1 302 ${phrase}\r\nLocation: /final\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`,
            "latin1",
          );
        });
      });
      await new Promise<void>((resolve) => raw.listen(0, "127.0.0.1", resolve));
      const rawPort = (raw.address() as AddressInfo).port;
      return {
        url: `http://127.0.0.1:${rawPort}/`,
        close: () => new Promise<void>((resolve) => raw.close(() => resolve())),
      };
    };

    it.each(["manual", "follow", "error"] as const)(
      "rejects with invalid_response in %s mode instead of throwing from the callback",
      async (redirect) => {
        const raw = await rawServer("Bad\u0001Phrase");
        try {
          await expect(
            createSafeFetch(options)(raw.url, { redirect }),
          ).rejects.toMatchObject({
            code: "invalid_response",
            cause: expect.any(TypeError),
          });
        } finally {
          await raw.close();
        }
      },
    );

    it("still resolves a redirect with a valid reason phrase at its headers", async () => {
      const raw = await rawServer("Found");
      try {
        const response = await createSafeFetch(options)(raw.url, {
          redirect: "manual",
        });
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/final");
      } finally {
        await raw.close();
      }
    });
  });

  describe("successful bodies that the caller discards", () => {
    const open: ServerResponse[] = [];
    afterEach(() => {
      open.splice(0).forEach((res) => res.destroy());
    });

    const revocationUrl = () => `http://127.0.0.1:${port}/revoke`;
    const capped = { ...options, maxResponseBytes: 1000, timeoutMs: 5000 };
    const revoke = (fetch: ReturnType<typeof createSafeFetch>) =>
      revokeToken({
        revocationEndpoint: revocationUrl(),
        token: "t",
        clientId: "c",
        allowPrivateNetworks: true,
        fetch,
      });

    it("does not fail a revocation whose successful body exceeds the transport limit", async () => {
      handler = (_req, res) => {
        res.statusCode = 200;
        res.end("x".repeat(5000));
      };
      await expect(revoke(createSafeFetch(capped))).resolves.toBeUndefined();
    });

    it("does not fail a revocation whose successful body declares a length above the limit", async () => {
      handler = (_req, res) => {
        res.setHeader("content-length", "500000");
        res.write("partial");
        open.push(res);
      };
      await expect(revoke(createSafeFetch(capped))).resolves.toBeUndefined();
    });

    it("does not wait for a successful body that never ends", async () => {
      let closed = false;
      handler = (_req, res) => {
        res.statusCode = 200;
        res.write("partial");
        res.on("close", () => {
          closed = true;
        });
        open.push(res);
      };
      const startedAt = Date.now();
      await expect(
        revoke(createSafeFetch({ ...capped, timeoutMs: 3000 })),
      ).resolves.toBeUndefined();
      expect(Date.now() - startedAt).toBeLessThan(1500);
      await vi.waitFor(() => expect(closed).toBe(true));
    });

    it("returns the headers of a successful response when the hint is set and cancels the body on discard", async () => {
      let closed = false;
      handler = (_req, res) => {
        res.statusCode = 200;
        res.setHeader("x-seen", "yes");
        res.write("partial");
        res.on("close", () => {
          closed = true;
        });
        open.push(res);
      };
      const response = await createSafeFetch(capped)(revocationUrl(), {
        method: "POST",
        redirect: "error",
        discardSuccessBody: true,
      } as RequestInit);
      expect(response.status).toBe(200);
      expect(response.headers.get("x-seen")).toBe("yes");
      await response.body?.cancel();
      await vi.waitFor(() => expect(closed).toBe(true));
    });

    it("keeps bounding a streamed successful body that is read", async () => {
      handler = (_req, res) => {
        res.statusCode = 200;
        res.end("x".repeat(5000));
      };
      const response = await createSafeFetch(capped)(revocationUrl(), {
        method: "POST",
        discardSuccessBody: true,
      } as RequestInit);
      await expect(response.text()).rejects.toMatchObject({
        code: "response_too_large",
      });
    });

    it("keeps bounded reads for error responses of a revocation", async () => {
      handler = (_req, res) => {
        res.statusCode = 400;
        res.end("x".repeat(5000));
      };
      await expect(revoke(createSafeFetch(capped))).rejects.toMatchObject({
        code: "response_too_large",
      });
    });

    it("surfaces the OAuth error of a revocation failure through the transport", async () => {
      handler = (_req, res) => {
        res.statusCode = 400;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "unsupported_token_type" }));
      };
      await expect(revoke(createSafeFetch(capped))).rejects.toMatchObject({
        code: "unsupported_token_type",
        status: 400,
      });
    });

    it("keeps buffering and capping a successful body without the hint", async () => {
      handler = (_req, res) => {
        res.statusCode = 200;
        res.end("x".repeat(5000));
      };
      await expect(
        createSafeFetch(capped)(revocationUrl(), { method: "POST" }),
      ).rejects.toMatchObject({ code: "response_too_large" });
    });
  });

  describe("content-coded responses", () => {
    const url = () => `http://127.0.0.1:${port}/meta`;
    const payload = JSON.stringify({ ok: true });

    it("asks for identity encoding unless the caller chose otherwise", async () => {
      const seen: (string | undefined)[] = [];
      handler = (req, res) => {
        seen.push(req.headers["accept-encoding"]);
        res.end(payload);
      };
      const safe = createSafeFetch(options);
      await safe(url());
      await safe(url(), { headers: { "Accept-Encoding": "gzip" } });
      expect(seen).toEqual(["identity", "gzip"]);
    });

    it.each(["gzip", "br", "deflate", "gzip, identity", "GZIP"])(
      "rejects a %s encoded body instead of handing the encoded bytes to JSON consumers",
      async (encoding) => {
        handler = (_req, res) => {
          res.setHeader("content-type", "application/json");
          res.setHeader("content-encoding", encoding);
          res.end(gzipSync(payload));
        };
        await expect(createSafeFetch(options)(url())).rejects.toMatchObject({
          code: "unsupported_content_encoding",
        });
      },
    );

    it("fails fetchJson with the encoding error instead of invalid UTF-8", async () => {
      handler = (_req, res) => {
        res.setHeader("content-type", "application/json");
        res.setHeader("content-encoding", "gzip");
        res.end(gzipSync(payload));
      };
      await expect(
        fetchJson(createSafeFetch(options), url(), "Metadata", options),
      ).rejects.toMatchObject({ code: "unsupported_content_encoding" });
    });

    it.each([undefined, "identity", "Identity"])(
      "keeps identity-coded JSON working (%s)",
      async (encoding) => {
        handler = (_req, res) => {
          res.setHeader("content-type", "application/json");
          if (encoding) res.setHeader("content-encoding", encoding);
          res.end(payload);
        };
        const response = await createSafeFetch(options)(url());
        expect(await response.json()).toEqual({ ok: true });
      },
    );

    it("does not reject a HEAD response that only carries the header", async () => {
      handler = (_req, res) => {
        res.setHeader("content-encoding", "gzip");
        res.end();
      };
      const response = await createSafeFetch(options)(url(), {
        method: "HEAD",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("redirect responses with large or stalled bodies", () => {
    const open: ServerResponse[] = [];
    afterEach(() => {
      open.splice(0).forEach((res) => res.destroy());
    });

    const base = () => `http://127.0.0.1:${port}`;
    const capped = { ...options, maxResponseBytes: 1000, timeoutMs: 5000 };

    const huge = (res: ServerResponse) => {
      res.end("x".repeat(5000));
    };
    const stalled = (res: ServerResponse) => {
      res.write("partial");
    };

    const serve = (
      startBody: (res: ServerResponse) => void,
      withLocation = true,
    ) => {
      const closed: string[] = [];
      handler = (req, res) => {
        if (req.url === "/final") {
          res.setHeader("content-type", "application/json");
          res.end('{"ok":true}');
          return;
        }
        res.statusCode = 302;
        if (withLocation) res.setHeader("location", "/final");
        open.push(res);
        res.on("close", () => closed.push("start"));
        startBody(res);
      };
      return closed;
    };

    const waitFor = async (condition: () => boolean) => {
      const end = performance.now() + 1500;
      while (!condition() && performance.now() < end) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };

    it("returns a manual redirect with an oversized body at once and bounds reading it", async () => {
      serve(huge);
      const response = await createSafeFetch(capped)(`${base()}/start`, {
        redirect: "manual",
      });
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/final");
      await expect(response.text()).rejects.toMatchObject({
        code: "response_too_large",
      });
    });

    it("does not wait for a stalled manual redirect body and lets the caller cancel it", async () => {
      const closed = serve(stalled);
      const started = performance.now();
      const response = await createSafeFetch(capped)(`${base()}/start`, {
        redirect: "manual",
      });
      expect(performance.now() - started).toBeLessThan(1000);
      expect(response.status).toBe(302);
      await response.body?.cancel();
      await waitFor(() => closed.length > 0);
      expect(closed).toEqual(["start"]);
    });

    it("lets fetchJson follow a redirect whose body is above the cap", async () => {
      serve(huge);
      await expect(
        fetchJson(createSafeFetch(capped), `${base()}/start`, "Metadata", {
          allowPrivateNetworks: true,
        }),
      ).resolves.toEqual({ ok: true });
    });

    it("lets fetchJson follow a redirect whose body is stalled and cancels that body", async () => {
      const closed = serve(stalled);
      const started = performance.now();
      await expect(
        fetchJson(createSafeFetch(capped), `${base()}/start`, "Metadata", {
          allowPrivateNetworks: true,
        }),
      ).resolves.toEqual({ ok: true });
      expect(performance.now() - started).toBeLessThan(1000);
      await waitFor(() => closed.length > 0);
      expect(closed).toEqual(["start"]);
    });

    it.each([
      ["an oversized", huge],
      ["a stalled", stalled],
    ])(
      "follows a redirect that has %s body when the transport follows redirects",
      async (_label, body) => {
        serve(body);
        const started = performance.now();
        const response = await createSafeFetch(capped)(`${base()}/start`);
        expect(await response.json()).toEqual({ ok: true });
        expect(performance.now() - started).toBeLessThan(1000);
      },
    );

    it("keeps the redirect outcome in error mode and for non-GET requests", async () => {
      serve(huge);
      await expect(
        createSafeFetch(capped)(`${base()}/start`, { redirect: "error" }),
      ).rejects.toMatchObject({ code: "redirect_blocked" });
      await expect(
        createSafeFetch(capped)(`${base()}/start`, {
          method: "POST",
          body: "x",
        }),
      ).rejects.toMatchObject({ code: "redirect_blocked" });
    });

    it("keeps a small manual redirect body readable", async () => {
      serve((res) => {
        res.end("hello");
      });
      const response = await createSafeFetch(capped)(`${base()}/start`, {
        redirect: "manual",
      });
      expect(response.status).toBe(302);
      expect(await response.text()).toBe("hello");
    });

    it("bounds the time spent reading a streamed redirect body", async () => {
      serve((res) => {
        res.write("x");
        const trickle = setInterval(() => res.write("x"), 20);
        res.on("close", () => clearInterval(trickle));
      });
      const response = await createSafeFetch({
        ...options,
        maxResponseBytes: 1_000_000,
        timeoutMs: 150,
      })(`${base()}/start`, { redirect: "manual" });
      const started = performance.now();
      await expect(response.text()).rejects.toMatchObject({
        code: "request_timeout",
      });
      expect(performance.now() - started).toBeLessThan(1500);
    });

    it("keeps buffering and capping responses that are not redirects with a location", async () => {
      serve(huge, false);
      await expect(
        createSafeFetch(capped)(`${base()}/start`, { redirect: "manual" }),
      ).rejects.toMatchObject({ code: "response_too_large" });

      serve((res) => {
        res.end("hello");
      }, false);
      const response = await createSafeFetch(capped)(`${base()}/start`, {
        redirect: "manual",
      });
      expect(response.status).toBe(302);
      expect(await response.text()).toBe("hello");
    });
  });

  describe("credentials on redirects", () => {
    const sensitive = {
      authorization: "Bearer secret",
      "proxy-authorization": "Basic abc",
      cookie: "session=1",
      "x-keep": "yes",
    };

    const hopsTo = (locationOf: (host: string) => string) => {
      const seen: Record<string, string | string[] | undefined>[] = [];
      handler = (req, res) => {
        seen.push(req.headers);
        if (seen.length === 1) {
          res.statusCode = 302;
          res.setHeader("location", locationOf(req.headers.host ?? ""));
          res.end();
        } else {
          res.end("done");
        }
      };
      return seen;
    };

    it("removes credentials when the redirect changes origin", async () => {
      resolveTo("first.example.com", ["127.0.0.1", 4]);
      resolveTo("second.example.com", ["127.0.0.1", 4]);
      const seen = hopsTo(() => `http://second.example.com:${port}/final`);
      await createSafeFetch(options)(`http://first.example.com:${port}/start`, {
        headers: sensitive,
      });
      expect(seen).toHaveLength(2);
      expect(seen[0].authorization).toBe("Bearer secret");
      expect(seen[0].cookie).toBe("session=1");
      expect(seen[1].authorization).toBeUndefined();
      expect(seen[1]["proxy-authorization"]).toBeUndefined();
      expect(seen[1].cookie).toBeUndefined();
      expect(seen[1]["x-keep"]).toBe("yes");
    });

    it("keeps credentials for a same-origin redirect", async () => {
      resolveTo("first.example.com", ["127.0.0.1", 4]);
      const seen = hopsTo(() => "/final");
      await createSafeFetch(options)(`http://first.example.com:${port}/start`, {
        headers: sensitive,
      });
      expect(seen).toHaveLength(2);
      expect(seen[1].authorization).toBe("Bearer secret");
      expect(seen[1].cookie).toBe("session=1");
    });

    it("treats a different port as a different origin", async () => {
      resolveTo("first.example.com", ["127.0.0.1", 4]);
      const other = createServer((req, res) => {
        seenOther.push(req.headers);
        res.end("other");
      });
      const seenOther: Record<string, string | string[] | undefined>[] = [];
      await new Promise<void>((resolve) =>
        other.listen(0, "127.0.0.1", resolve),
      );
      const otherPort = (other.address() as AddressInfo).port;
      hopsTo(() => `http://first.example.com:${otherPort}/final`);
      handler = (_req, res) => {
        res.statusCode = 302;
        res.setHeader(
          "location",
          `http://first.example.com:${otherPort}/final`,
        );
        res.end();
      };
      try {
        await createSafeFetch(options)(
          `http://first.example.com:${port}/start`,
          { headers: sensitive },
        );
      } finally {
        await new Promise<void>((resolve) => other.close(() => resolve()));
      }
      expect(seenOther).toHaveLength(1);
      expect(seenOther[0].authorization).toBeUndefined();
      expect(seenOther[0]["x-keep"]).toBe("yes");
    });
  });

  it("returns redirects untouched in manual mode", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.statusCode = 302;
      res.setHeader("location", "https://elsewhere.example.com/");
      res.end();
    };
    const response = await createSafeFetch(options)(
      `http://pinned.example.com:${port}/`,
      { redirect: "manual" },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://elsewhere.example.com/",
    );
  });

  it("refuses redirects in error mode", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.statusCode = 307;
      res.setHeader("location", "/next");
      res.end();
    };
    await expect(
      createSafeFetch(options)(`http://pinned.example.com:${port}/`, {
        method: "POST",
        redirect: "error",
      }),
    ).rejects.toMatchObject({ code: "redirect_blocked" });
  });

  it("follows GET redirects hop by hop and re-resolves every host", async () => {
    resolveTo("first.example.com", ["127.0.0.1", 4]);
    resolveTo("second.example.com", ["127.0.0.1", 4]);
    let arrivedPath = "";
    handler = (req, res) => {
      if (req.headers.host?.startsWith("first.")) {
        res.statusCode = 301;
        res.setHeader("location", `http://second.example.com:${port}/final`);
        res.end();
      } else {
        arrivedPath = req.url ?? "";
        res.end("arrived");
      }
    };
    const response = await createSafeFetch(options)(
      `http://first.example.com:${port}/start`,
    );
    expect(await response.text()).toBe("arrived");
    expect(arrivedPath).toBe("/final");
    expect(lookupSpy.mock.calls.map((call) => call[0])).toEqual([
      "first.example.com",
      "second.example.com",
    ]);
  });

  it("does not follow redirects for non-GET requests", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.statusCode = 307;
      res.setHeader("location", "/next");
      res.end();
    };
    await expect(
      createSafeFetch(options)(`http://pinned.example.com:${port}/`, {
        method: "POST",
        body: "x",
      }),
    ).rejects.toMatchObject({ code: "redirect_blocked" });
  });

  it("stops after too many redirects", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.statusCode = 302;
      res.setHeader("location", `http://pinned.example.com:${port}/again`);
      res.end();
    };
    await expect(
      createSafeFetch({ ...options, maxRedirects: 2 })(
        `http://pinned.example.com:${port}/`,
      ),
    ).rejects.toMatchObject({ code: "too_many_redirects" });
  });

  it("times out slow servers", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = () => undefined;
    await expect(
      createSafeFetch({ ...options, timeoutMs: 50 })(
        `http://pinned.example.com:${port}/`,
      ),
    ).rejects.toMatchObject({ code: "request_timeout" });
  });

  it("bounds the whole request, not only socket inactivity", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.write("x");
      const trickle = setInterval(() => res.write("x"), 20);
      res.on("close", () => clearInterval(trickle));
    };
    const started = Date.now();
    await expect(
      createSafeFetch({ ...options, timeoutMs: 150 })(
        `http://pinned.example.com:${port}/`,
      ),
    ).rejects.toMatchObject({ code: "request_timeout" });
    expect(Date.now() - started).toBeLessThan(1500);
  });

  it("rejects instead of crashing when the server sends an invalid status", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.statusCode = 600;
      res.end("odd");
    };
    const result = createSafeFetch(options)(
      `http://pinned.example.com:${port}/`,
    );
    await expect(result).rejects.toBeInstanceOf(AgentAuthError);
    await expect(result).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("rejects a declared Content-Length above the cap before the body arrives", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.setHeader("content-length", "5000");
      res.flushHeaders();
    };
    const started = Date.now();
    await expect(
      createSafeFetch({ ...options, maxResponseBytes: 1000, timeoutMs: 5000 })(
        `http://pinned.example.com:${port}/`,
      ),
    ).rejects.toMatchObject({ code: "response_too_large" });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("does not apply the declared-length cap to a HEAD response", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.setHeader("content-length", "5000");
      res.end();
    };
    const response = await createSafeFetch({
      ...options,
      maxResponseBytes: 1000,
    })(`http://pinned.example.com:${port}/`, { method: "HEAD" });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe("5000");
    expect(response.body).toBeNull();
    expect(await response.text()).toBe("");
  });

  it("does not apply the declared-length cap to a 304 response", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.statusCode = 304;
      res.setHeader("content-length", "5000");
      res.end();
    };
    const response = await createSafeFetch({
      ...options,
      maxResponseBytes: 1000,
    })(`http://pinned.example.com:${port}/`);
    expect(response.status).toBe(304);
    expect(response.body).toBeNull();
    expect(await response.text()).toBe("");
  });

  it.each([
    ["HEAD", 200],
    ["GET", 204],
    ["GET", 205],
    ["GET", 304],
  ])("gives a %s %i response a null body", async (method, status) => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.statusCode = status;
      res.end();
    };
    const response = await createSafeFetch(options)(
      `http://pinned.example.com:${port}/`,
      { method },
    );
    expect(response.status).toBe(status);
    expect(response.body).toBeNull();
  });

  it("keeps a readable body on responses that can carry content", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.setHeader("content-length", "5");
      res.end("hello");
    };
    const safe = createSafeFetch({ ...options, maxResponseBytes: 1000 });
    const response = await safe(`http://pinned.example.com:${port}/`);
    expect(response.body).not.toBeNull();
    expect(await response.text()).toBe("hello");

    handler = (_req, res) => {
      res.end();
    };
    const empty = await safe(`http://pinned.example.com:${port}/`);
    expect(empty.status).toBe(200);
    expect(empty.body).not.toBeNull();
    expect(await empty.text()).toBe("");
  });

  it("still applies the declared-length cap to GET and POST responses", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.setHeader("content-length", "5000");
      res.flushHeaders();
    };
    const safe = createSafeFetch({
      ...options,
      maxResponseBytes: 1000,
      timeoutMs: 5000,
    });
    for (const method of ["GET", "POST"]) {
      await expect(
        safe(`http://pinned.example.com:${port}/`, { method }),
      ).rejects.toMatchObject({ code: "response_too_large" });
    }
  });

  it("caps the response size", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.end("x".repeat(5000));
    };
    await expect(
      createSafeFetch({ ...options, maxResponseBytes: 1000 })(
        `http://pinned.example.com:${port}/`,
      ),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("handles responses without a body", async () => {
    resolveTo("pinned.example.com", ["127.0.0.1", 4]);
    handler = (_req, res) => {
      res.statusCode = 204;
      res.end();
    };
    const response = await createSafeFetch(options)(
      `http://pinned.example.com:${port}/`,
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
