import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
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
      await createSafeFetch(options)(`http://first.example.com:${port}/start`, {
        headers: sensitive,
      });
      await new Promise<void>((resolve) => other.close(() => resolve()));
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
