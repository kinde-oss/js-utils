import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentAuthError } from "./errors";
import { fetchJson, isPrivateHost, postForm, postJson } from "./http";
import { jsonResponse, mockFetch } from "./testUtils";

describe("isPrivateHost", () => {
  it.each([
    "localhost",
    "LOCALHOST.",
    "app.localhost",
    "metadata",
    "metadata.internal",
    "printer.local",
    "0.0.0.0",
    "10.0.0.5",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "100.64.0.1",
    "198.18.0.1",
    "224.0.0.1",
    "[::1]",
    "[::]",
    "[fe80::1]",
    "[fc00::1]",
    "[fd12:3456::1]",
    "[ff02::1]",
    "[::ffff:7f00:1]",
    "[::ffff:a00:5]",
    "[64:ff9b::a00:5]",
  ])("treats %s as private", (host) => {
    expect(isPrivateHost(host)).toBe(true);
  });

  it.each([
    "example.com",
    "api.example.com",
    "8.8.8.8",
    "172.15.0.1",
    "172.32.0.1",
    "100.63.0.1",
    "192.169.0.1",
    "198.20.0.1",
    "[2606:4700::1111]",
    "[::ffff:808:808]",
  ])("treats %s as public", (host) => {
    expect(isPrivateHost(host)).toBe(false);
  });

  it("recognises numeric forms the URL parser normalises", () => {
    expect(isPrivateHost(new URL("http://2130706433/").hostname)).toBe(true);
    expect(isPrivateHost(new URL("http://0x7f.1/").hostname)).toBe(true);
    expect(isPrivateHost(new URL("http://[::ffff:127.0.0.1]/").hostname)).toBe(
      true,
    );
  });
});

const redirect = (location: string, status = 302) =>
  new Response(null, { status, headers: { Location: location } });

describe("fetchJson", () => {
  it("refuses a private destination without calling fetch", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}));
    await expect(
      fetchJson(fetchMock, "https://10.0.0.5/meta", "Metadata"),
    ).rejects.toMatchObject({ code: "private_network_blocked" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows a private destination when explicitly enabled", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ ok: true }));
    await expect(
      fetchJson(fetchMock, "https://10.0.0.5/meta", "Metadata", {
        allowPrivateNetworks: true,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("follows redirects manually to a public destination", async () => {
    const fetchMock = mockFetch((url) =>
      url === "https://a.example.com/meta"
        ? redirect("https://b.example.com/meta", 301)
        : url === "https://b.example.com/meta"
          ? redirect("/final", 307)
          : jsonResponse({ ok: true }),
    );
    await expect(
      fetchJson(fetchMock, "https://a.example.com/meta", "Metadata"),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://a.example.com/meta",
      "https://b.example.com/meta",
      "https://b.example.com/final",
    ]);
    for (const call of fetchMock.mock.calls) {
      expect(call[1].redirect).toBe("manual");
    }
  });

  it.each([
    "https://10.0.0.5/meta",
    "https://metadata.internal/",
    "https://169.254.169.254/latest/meta-data",
    "http://api.example.com/meta",
  ])("blocks a redirect to %s before connecting", async (location) => {
    const fetchMock = mockFetch((url) =>
      url === "https://a.example.com/meta"
        ? redirect(location)
        : jsonResponse({ leaked: true }),
    );
    await expect(
      fetchJson(fetchMock, "https://a.example.com/meta", "Metadata"),
    ).rejects.toBeInstanceOf(AgentAuthError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks a redirect to a private destination with the right code", async () => {
    const fetchMock = mockFetch(() => redirect("https://10.0.0.5/meta"));
    await expect(
      fetchJson(fetchMock, "https://a.example.com/meta", "Metadata"),
    ).rejects.toMatchObject({ code: "private_network_blocked" });
  });

  it("stops after too many redirects", async () => {
    const fetchMock = mockFetch(() => redirect("https://a.example.com/loop"));
    await expect(
      fetchJson(fetchMock, "https://a.example.com/loop", "Metadata"),
    ).rejects.toMatchObject({ code: "too_many_redirects" });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("fails clearly when the redirect destination is unreadable", async () => {
    await expect(
      fetchJson(
        mockFetch(() => new Response(null, { status: 302 })),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).rejects.toMatchObject({ code: "redirect_blocked" });

    const opaque = new Response(null, { status: 200 });
    Object.defineProperty(opaque, "type", { value: "opaqueredirect" });
    await expect(
      fetchJson(
        mockFetch(() => opaque),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).rejects.toMatchObject({ code: "redirect_blocked" });
  });
});

const aborted = () => new DOMException("aborted", "AbortError");

const neverAnswers = (_url: string, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(aborted()));
  });

const stalledBody = (_url: string, init?: RequestInit) =>
  Promise.resolve(
    new Response(
      new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener("abort", () =>
            controller.error(aborted()),
          );
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );

const streamOf = (...sizes: number[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const size of sizes) {
          controller.enqueue(new Uint8Array(size).fill(120));
        }
        controller.close();
      },
    }),
    { status: 200 },
  );

describe("request limits", () => {
  it("times out a server that never answers", async () => {
    await expect(
      fetchJson(
        mockFetch(neverAnswers),
        "https://a.example.com/meta",
        "Metadata",
        {
          timeoutMs: 20,
        },
      ),
    ).rejects.toMatchObject({ code: "request_timeout" });
  });

  it("keeps the deadline running while the body is read", async () => {
    await expect(
      fetchJson(
        mockFetch(stalledBody),
        "https://a.example.com/meta",
        "Metadata",
        {
          timeoutMs: 30,
        },
      ),
    ).rejects.toMatchObject({ code: "request_timeout" });
  });

  describe("a fetch that ignores the abort signal", () => {
    const pending = <T>() => new Promise<T>(() => undefined);

    const stallingIgnoringAbort = () =>
      Promise.resolve(
        new Response(new ReadableStream({ start: () => undefined }), {
          status: 200,
        }),
      );

    it.each([
      ["never answers", () => pending<Response>()],
      ["returns a stalled body", stallingIgnoringAbort],
    ])(
      "fetchJson still rejects with request_timeout when the server %s",
      async (_label, handler) => {
        const started = Date.now();
        await expect(
          fetchJson(
            mockFetch(handler),
            "https://a.example.com/meta",
            "Metadata",
            { timeoutMs: 40 },
          ),
        ).rejects.toMatchObject({ code: "request_timeout" });
        expect(Date.now() - started).toBeLessThan(1000);
      },
    );

    it.each([
      [
        "postForm",
        (f: typeof fetch) =>
          postForm(
            f,
            "https://a.example.com/token",
            { a: "1" },
            { timeoutMs: 40 },
          ),
      ],
      [
        "postJson",
        (f: typeof fetch) =>
          postJson(
            f,
            "https://a.example.com/register",
            { a: 1 },
            { timeoutMs: 40 },
          ),
      ],
    ])("%s still rejects with request_timeout", async (_name, send) => {
      await expect(
        send(mockFetch(() => pending<Response>())),
      ).rejects.toMatchObject({ code: "request_timeout" });
      await expect(
        send(mockFetch(stallingIgnoringAbort)),
      ).rejects.toMatchObject({ code: "request_timeout" });
    });

    it("does not follow another redirect after the deadline has passed", async () => {
      const fetchMock = mockFetch(
        (url) =>
          new Promise<Response>((resolve) => {
            if (url === "https://a.example.com/meta") {
              setTimeout(
                () =>
                  resolve(
                    new Response(null, {
                      status: 302,
                      headers: { Location: "https://b.example.com/meta" },
                    }),
                  ),
                120,
              );
            } else {
              resolve(jsonResponse({ leaked: true }));
            }
          }),
      );
      await expect(
        fetchJson(fetchMock, "https://a.example.com/meta", "Metadata", {
          timeoutMs: 30,
        }),
      ).rejects.toMatchObject({ code: "request_timeout" });
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("does not read a late body after the deadline has passed", async () => {
      const late = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("{}"));
            controller.close();
          },
        }),
        { status: 200 },
      );
      const getReader = vi.spyOn(late.body as ReadableStream, "getReader");
      const fetchMock = mockFetch(
        () =>
          new Promise<Response>((resolve) => {
            setTimeout(() => resolve(late), 120);
          }),
      );
      await expect(
        fetchJson(fetchMock, "https://a.example.com/meta", "Metadata", {
          timeoutMs: 30,
        }),
      ).rejects.toMatchObject({ code: "request_timeout" });
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(getReader).not.toHaveBeenCalled();
    });

    it("does not reject a request that finishes before the deadline", async () => {
      await expect(
        fetchJson(
          mockFetch(() => jsonResponse({ ok: true })),
          "https://a.example.com/meta",
          "Metadata",
          { timeoutMs: 500 },
        ),
      ).resolves.toEqual({ ok: true });
    });
  });

  it("passes an abort signal to every request", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ ok: true }));
    await fetchJson(fetchMock, "https://a.example.com/meta", "Metadata");
    await postForm(fetchMock, "https://a.example.com/token", { a: "1" });
    await postJson(fetchMock, "https://a.example.com/register", { a: 1 });
    for (const call of fetchMock.mock.calls) {
      expect(call[1].signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("does not leave the deadline running after a normal response", async () => {
    const clear = vi.spyOn(globalThis, "clearTimeout");
    await fetchJson(
      mockFetch(() => jsonResponse({ ok: true })),
      "https://a.example.com/meta",
      "Metadata",
    );
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });

  it("rejects a body larger than the cap while streaming", async () => {
    await expect(
      fetchJson(
        mockFetch(() => streamOf(600, 600)),
        "https://a.example.com/meta",
        "Metadata",
        { maxResponseBytes: 1000 },
      ),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("rejects a declared Content-Length above the cap without reading the body", async () => {
    const response = new Response("{}", {
      status: 200,
      headers: { "content-length": "5000" },
    });
    const read = vi.spyOn(response.body as ReadableStream, "getReader");
    await expect(
      fetchJson(
        mockFetch(() => response),
        "https://a.example.com/meta",
        "Metadata",
        { maxResponseBytes: 1000 },
      ),
    ).rejects.toMatchObject({ code: "response_too_large" });
    expect(read).not.toHaveBeenCalled();
  });

  it("accepts a body that fits the cap", async () => {
    await expect(
      fetchJson(
        mockFetch(() => jsonResponse({ ok: true })),
        "https://a.example.com/meta",
        "Metadata",
        { maxResponseBytes: 1000 },
      ),
    ).resolves.toEqual({ ok: true });
  });

  it.each([
    [
      "postForm",
      (f: typeof fetch, o: object) =>
        postForm(f, "https://a.example.com/token", { a: "1" }, o),
    ],
    [
      "postJson",
      (f: typeof fetch, o: object) =>
        postJson(f, "https://a.example.com/register", { a: 1 }, o),
    ],
  ])("%s enforces the timeout and the size cap", async (_name, send) => {
    await expect(
      send(mockFetch(neverAnswers), { timeoutMs: 20 }),
    ).rejects.toMatchObject({ code: "request_timeout" });
    await expect(
      send(mockFetch(stalledBody), { timeoutMs: 30 }),
    ).rejects.toMatchObject({ code: "request_timeout" });
    await expect(
      send(
        mockFetch(() => streamOf(600, 600)),
        { maxResponseBytes: 1000 },
      ),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("returns a readable response from the post helpers", async () => {
    const response = await postForm(
      mockFetch(() => jsonResponse({ access_token: "at" }, { status: 201 })),
      "https://a.example.com/token",
      { a: "1" },
    );
    expect(response.status).toBe(201);
    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({ access_token: "at" });
  });

  it("handles responses that must not have a body", async () => {
    const response = await postJson(
      mockFetch(() => new Response(null, { status: 204 })),
      "https://a.example.com/revoke",
      {},
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});

describe("UTF-8 decoding of buffered bodies", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const text = "Zoë 日本語 🚀 café";
  const encoded = (value: string) => new TextEncoder().encode(value);
  const fetchBytes = (bytes: Uint8Array) =>
    fetchJson<{ name: string }>(
      mockFetch(
        () => new Response(bytes as unknown as BodyInit, { status: 200 }),
      ),
      "https://a.example.com/meta",
      "Metadata",
    );

  it("preserves non-ASCII JSON", async () => {
    await expect(
      fetchJson(
        mockFetch(() => jsonResponse({ name: text })),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).resolves.toEqual({ name: text });
  });

  it("preserves non-ASCII JSON when the response has no readable stream", async () => {
    const response = jsonResponse({ name: text });
    Object.defineProperty(response, "body", { value: undefined });
    await expect(
      fetchJson(
        mockFetch(() => response),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).resolves.toEqual({ name: text });
  });

  it("does not depend on the Response implementation decoding bytes", async () => {
    class Latin1Response {
      status: number;
      statusText: string;
      headers: Headers;
      ok: boolean;
      private bytes?: Uint8Array;
      private value?: string;
      constructor(body: unknown, init: ResponseInit = {}) {
        this.status = init.status ?? 200;
        this.statusText = init.statusText ?? "";
        this.headers = new Headers(init.headers);
        this.ok = this.status >= 200 && this.status < 300;
        if (body instanceof Uint8Array) this.bytes = body;
        else if (typeof body === "string") this.value = body;
      }
      async text() {
        return (
          this.value ??
          Array.from(this.bytes ?? [], (b) => String.fromCharCode(b)).join("")
        );
      }
      async json() {
        return JSON.parse(await this.text());
      }
    }
    const native = jsonResponse({ name: text });
    vi.stubGlobal("Response", Latin1Response);
    await expect(
      fetchJson(
        mockFetch(() => native),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).resolves.toEqual({ name: text });
  });

  it.each([
    ["with TextDecoder", () => undefined],
    ["without TextDecoder", () => vi.stubGlobal("TextDecoder", undefined)],
  ])("decodes UTF-8 correctly %s", async (_label, setup) => {
    setup();
    await expect(
      fetchBytes(encoded(JSON.stringify({ name: text }))),
    ).resolves.toEqual({ name: text });
  });

  it.each([
    ["with TextDecoder", () => undefined],
    ["without TextDecoder", () => vi.stubGlobal("TextDecoder", undefined)],
  ])("strips a UTF-8 byte order mark %s", async (_label, setup) => {
    setup();
    const json = encoded(JSON.stringify({ name: "ok" }));
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...json]);
    await expect(fetchBytes(withBom)).resolves.toEqual({ name: "ok" });
  });

  it.each([
    ["with TextDecoder", () => undefined],
    ["without TextDecoder", () => vi.stubGlobal("TextDecoder", undefined)],
  ])("rejects bytes that are not valid UTF-8 %s", async (_label, setup) => {
    setup();
    await expect(
      fetchBytes(new Uint8Array([0x7b, 0x22, 0xff, 0xfe, 0x22, 0x7d])),
    ).rejects.toMatchObject({
      code: "invalid_response",
      description: expect.stringContaining("UTF-8"),
    });
  });

  it("still enforces the cap in bytes, not characters", async () => {
    const body = JSON.stringify({ name: "é".repeat(600) });
    expect(body.length).toBeLessThan(1000);
    expect(encoded(body).byteLength).toBeGreaterThan(1000);
    await expect(
      fetchJson(
        mockFetch(() => new Response(body, { status: 200 })),
        "https://a.example.com/meta",
        "Metadata",
        { maxResponseBytes: 1000 },
      ),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("decodes error bodies the same way", async () => {
    await expect(
      fetchJson(
        mockFetch(() =>
          jsonResponse(
            { error: "invalid_request", error_description: "Fehler: Größe" },
            { status: 400 },
          ),
        ),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).rejects.toMatchObject({
      code: "invalid_request",
      description: "Fehler: Größe",
    });
  });
});

describe("redirect response bodies", () => {
  const redirectWithBody = (location?: string, status = 302) => {
    const response = new Response(
      new ReadableStream({ start: () => undefined }),
      {
        status,
        headers: location ? { Location: location } : {},
      },
    );
    const cancel = vi.spyOn(response.body as ReadableStream, "cancel");
    return { response, cancel };
  };

  it("cancels the redirect body before following the redirect", async () => {
    const { response, cancel } = redirectWithBody("https://b.example.com/meta");
    const fetchMock = mockFetch((url) =>
      url === "https://a.example.com/meta"
        ? response
        : jsonResponse({ ok: true }),
    );
    await expect(
      fetchJson(fetchMock, "https://a.example.com/meta", "Metadata"),
    ).resolves.toEqual({ ok: true });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("cancels the redirect body before rejecting a redirect with no location", async () => {
    const { response, cancel } = redirectWithBody();
    await expect(
      fetchJson(
        mockFetch(() => response),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).rejects.toMatchObject({ code: "redirect_blocked" });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("cancels the redirect body before rejecting an invalid location", async () => {
    const { response, cancel } = redirectWithBody("http://[bad");
    await expect(
      fetchJson(
        mockFetch(() => response),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).rejects.toMatchObject({ code: "redirect_blocked" });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not let a failing cancellation replace the redirect outcome", async () => {
    const followed = redirectWithBody("https://b.example.com/meta");
    followed.cancel.mockRejectedValue(new Error("cancel failed"));
    await expect(
      fetchJson(
        mockFetch((url) =>
          url === "https://a.example.com/meta"
            ? followed.response
            : jsonResponse({ ok: true }),
        ),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).resolves.toEqual({ ok: true });

    const rejected = redirectWithBody();
    rejected.cancel.mockRejectedValue(new Error("cancel failed"));
    await expect(
      fetchJson(
        mockFetch(() => rejected.response),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).rejects.toMatchObject({ code: "redirect_blocked" });
  });

  it("still handles a redirect without a body", async () => {
    await expect(
      fetchJson(
        mockFetch((url) =>
          url === "https://a.example.com/meta"
            ? new Response(null, {
                status: 301,
                headers: { Location: "https://b.example.com/meta" },
              })
            : jsonResponse({ ok: true }),
        ),
        "https://a.example.com/meta",
        "Metadata",
      ),
    ).resolves.toEqual({ ok: true });
  });
});

describe("discarding a successful response body", () => {
  const largeOk = () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(600).fill(120));
          controller.enqueue(new Uint8Array(600).fill(120));
          controller.close();
        },
      }),
      { status: 200 },
    );
    const getReader = vi.spyOn(response.body as ReadableStream, "getReader");
    const cancel = vi.spyOn(response.body as ReadableStream, "cancel");
    return { response, getReader, cancel };
  };

  it("accepts a successful response whose body is above the cap without reading it", async () => {
    const { response, getReader, cancel } = largeOk();
    const result = await postForm(
      mockFetch(() => response),
      "https://a.example.com/revoke",
      { token: "t" },
      { maxResponseBytes: 1000, discardSuccessBody: true },
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(getReader).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("accepts a successful response whose body never ends", async () => {
    const result = await postForm(
      mockFetch(
        () =>
          new Response(new ReadableStream({ start: () => undefined }), {
            status: 200,
          }),
      ),
      "https://a.example.com/revoke",
      { token: "t" },
      { timeoutMs: 40, discardSuccessBody: true },
    );
    expect(result.status).toBe(200);
  });

  it("is not affected by a failing cancellation", async () => {
    const { response, cancel } = largeOk();
    cancel.mockRejectedValue(new Error("cancel failed"));
    const result = await postForm(
      mockFetch(() => response),
      "https://a.example.com/revoke",
      { token: "t" },
      { discardSuccessBody: true },
    );
    expect(result.status).toBe(200);
  });

  it("still reads a bounded body for error responses", async () => {
    const result = await postForm(
      mockFetch(() =>
        jsonResponse({ error: "invalid_client" }, { status: 401 }),
      ),
      "https://a.example.com/revoke",
      { token: "t" },
      { discardSuccessBody: true },
    );
    expect(result.status).toBe(401);
    expect(await result.json()).toEqual({ error: "invalid_client" });

    await expect(
      postForm(
        mockFetch(
          () =>
            new Response(new Uint8Array(5000), {
              status: 500,
              headers: { "content-length": "5000" },
            }),
        ),
        "https://a.example.com/revoke",
        { token: "t" },
        { maxResponseBytes: 1000, discardSuccessBody: true },
      ),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("keeps the bounded read for operations that need the body", async () => {
    const { response } = largeOk();
    await expect(
      postForm(
        mockFetch(() => response),
        "https://a.example.com/token",
        { a: "1" },
        { maxResponseBytes: 1000 },
      ),
    ).rejects.toMatchObject({ code: "response_too_large" });
  });
});

describe("cancelling a stalled body reader on timeout", () => {
  const stalledBody = (cancel: () => void) =>
    new Response(new ReadableStream({ start: () => undefined, cancel }), {
      status: 200,
    });

  const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

  it("cancels the body stream when the deadline expires during a read", async () => {
    const cancel = vi.fn();
    await expect(
      fetchJson(
        mockFetch(() => stalledBody(cancel)),
        "https://a.example.com/meta",
        "Metadata",
        { timeoutMs: 40 },
      ),
    ).rejects.toMatchObject({ code: "request_timeout" });
    await settle();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("cancels the body stream for POST helpers too", async () => {
    const cancel = vi.fn();
    await expect(
      postForm(
        mockFetch(() => stalledBody(cancel)),
        "https://a.example.com/token",
        { a: "1" },
        { timeoutMs: 40 },
      ),
    ).rejects.toMatchObject({ code: "request_timeout" });
    await settle();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not cancel a body that finishes before the deadline", async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"ok":true}'));
          controller.close();
        },
        cancel,
      }),
      { status: 200 },
    );
    await expect(
      fetchJson(
        mockFetch(() => response),
        "https://a.example.com/meta",
        "Metadata",
        { timeoutMs: 40 },
      ),
    ).resolves.toEqual({ ok: true });
    await settle();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("removes its abort listener when the read finishes", async () => {
    const added: string[] = [];
    const removed: string[] = [];
    const original = AbortSignal.prototype.addEventListener;
    const originalRemove = AbortSignal.prototype.removeEventListener;
    vi.spyOn(AbortSignal.prototype, "addEventListener").mockImplementation(
      function (this: AbortSignal, type: string, ...rest: unknown[]) {
        added.push(type);
        return (original as (...args: unknown[]) => void).call(
          this,
          type,
          ...rest,
        );
      } as typeof AbortSignal.prototype.addEventListener,
    );
    vi.spyOn(AbortSignal.prototype, "removeEventListener").mockImplementation(
      function (this: AbortSignal, type: string, ...rest: unknown[]) {
        removed.push(type);
        return (originalRemove as (...args: unknown[]) => void).call(
          this,
          type,
          ...rest,
        );
      } as typeof AbortSignal.prototype.removeEventListener,
    );
    try {
      await fetchJson(
        mockFetch(() => jsonResponse({ ok: true })),
        "https://a.example.com/meta",
        "Metadata",
      );
    } finally {
      vi.restoreAllMocks();
    }
    expect(added.filter((type) => type === "abort").length).toBeGreaterThan(0);
    expect(removed.filter((type) => type === "abort")).toHaveLength(
      added.filter((type) => type === "abort").length,
    );
  });
});
