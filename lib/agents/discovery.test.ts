import { describe, expect, it } from "vitest";
import { discoverAgentAuth, parseWwwAuthenticate } from "./discovery";
import { jsonResponse, mockFetch, serverMetadata } from "./testUtils";

const prm = {
  resource: "https://api.example.com/mcp",
  authorization_servers: ["https://auth.example.com"],
};

const routes = (url: string) => {
  if (
    url === "https://api.example.com/.well-known/oauth-protected-resource/mcp"
  )
    return jsonResponse(prm);
  if (url === "https://auth.example.com/.well-known/oauth-authorization-server")
    return jsonResponse(serverMetadata);
  return new Response("nope", { status: 404 });
};

describe("parseWwwAuthenticate", () => {
  it("parses bearer params", () => {
    expect(
      parseWwwAuthenticate(
        'Bearer realm="api", resource_metadata="https://a.example/.well-known/oauth-protected-resource", scope="read write openid"',
      ),
    ).toMatchObject({
      realm: "api",
      resourceMetadata:
        "https://a.example/.well-known/oauth-protected-resource",
      scope: "read write openid",
    });
  });

  it("returns null without a bearer challenge", () => {
    expect(parseWwwAuthenticate('Basic realm="x"')).toBeNull();
    expect(parseWwwAuthenticate(null)).toBeNull();
  });

  it("handles escaped quotes in values", () => {
    expect(
      parseWwwAuthenticate('Bearer error_description="say \\"hi\\""')
        ?.errorDescription,
    ).toBe('say "hi"');
  });

  it("stays fast on pathological input", () => {
    const start = Date.now();
    parseWwwAuthenticate(`Bearer ${"A".repeat(100000)}`);
    parseWwwAuthenticate(`Bearer ${"A ".repeat(50000)}`);
    parseWwwAuthenticate(`Bearer realm="${"\\".repeat(50000)}`);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("ignores params of other schemes", () => {
    const result = parseWwwAuthenticate(
      'Bearer error="invalid_token", Basic realm="other"',
    );
    expect(result?.error).toBe("invalid_token");
    expect(result?.realm).toBeUndefined();
  });
});

describe("discoverAgentAuth", () => {
  it("discovers from the challenge header", async () => {
    const fetchMock = mockFetch((url) =>
      url === "https://api.example.com/meta" ? jsonResponse(prm) : routes(url),
    );
    const response = new Response(null, {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer resource_metadata="https://api.example.com/meta", scope="read openid"',
      },
    });
    const result = await discoverAgentAuth({
      response,
      resourceUrl: prm.resource,
      fetch: fetchMock,
    });
    expect(result.resource).toBe(prm.resource);
    expect(result.authorizationServer.token_endpoint).toBe(
      serverMetadata.token_endpoint,
    );
    expect(result.scope).toBe("read");
  });

  it("handles resource urls with many trailing slashes", async () => {
    const result = await discoverAgentAuth({
      wwwAuthenticate: "Bearer",
      resourceUrl: `https://api.example.com/mcp${"/".repeat(50000)}`,
      fetch: mockFetch(routes),
    });
    expect(result.resource).toBe(prm.resource);
  });

  it("falls back to the well-known url from resourceUrl", async () => {
    const result = await discoverAgentAuth({
      wwwAuthenticate: "Bearer",
      resourceUrl: "https://api.example.com/mcp",
      fetch: mockFetch(routes),
    });
    expect(result.resourceMetadataUrl).toBe(
      "https://api.example.com/.well-known/oauth-protected-resource/mcp",
    );
  });

  it("falls back to the root protected-resource metadata", async () => {
    const fetchMock = mockFetch((url) =>
      url === "https://api.example.com/.well-known/oauth-protected-resource"
        ? jsonResponse(prm)
        : url.includes("oauth-protected-resource")
          ? new Response("nope", { status: 404 })
          : routes(url),
    );
    const result = await discoverAgentAuth({
      wwwAuthenticate: "Bearer",
      resourceUrl: prm.resource,
      fetch: fetchMock,
    });
    expect(result.resourceMetadataUrl).toBe(
      "https://api.example.com/.well-known/oauth-protected-resource",
    );
  });

  it("rejects a root document that describes a different resource", async () => {
    const fetchMock = mockFetch((url) =>
      url === "https://api.example.com/.well-known/oauth-protected-resource"
        ? jsonResponse({ ...prm, resource: "https://api.example.com/other" })
        : url.includes("oauth-protected-resource")
          ? new Response("nope", { status: 404 })
          : routes(url),
    );
    await expect(
      discoverAgentAuth({
        wwwAuthenticate: "Bearer",
        resourceUrl: prm.resource,
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: "resource_mismatch" });
  });

  it("does not fall back when the challenge provides resource_metadata", async () => {
    const fetchMock = mockFetch((url) =>
      url === "https://api.example.com/meta"
        ? new Response("nope", { status: 404 })
        : routes(url),
    );
    await expect(
      discoverAgentAuth({
        wwwAuthenticate:
          'Bearer resource_metadata="https://api.example.com/meta"',
        resourceUrl: prm.resource,
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to openid-configuration for the document location only", async () => {
    const fetchMock = mockFetch((url) =>
      url === "https://auth.example.com/.well-known/openid-configuration"
        ? jsonResponse(serverMetadata)
        : routes(url),
    );
    const result = await discoverAgentAuth({
      wwwAuthenticate: "Bearer",
      resourceUrl: "https://api.example.com/mcp",
      fetch: fetchMock,
    });
    expect(result.authorizationServer.issuer).toBe(serverMetadata.issuer);
  });

  it("rejects non-401 responses", async () => {
    await expect(
      discoverAgentAuth({
        response: new Response(null, { status: 200 }),
        resourceUrl: prm.resource,
        fetch: mockFetch(routes),
      }),
    ).rejects.toMatchObject({ code: "not_unauthorized" });
  });

  it("requires resourceUrl to validate metadata from the challenge", async () => {
    await expect(
      discoverAgentAuth({
        wwwAuthenticate:
          'Bearer resource_metadata="https://api.example.com/.well-known/oauth-protected-resource/mcp"',
        fetch: mockFetch(routes),
      } as unknown as Parameters<typeof discoverAgentAuth>[0]),
    ).rejects.toThrow(/missing_resource_url/);
  });

  it("rejects resource mismatches", async () => {
    await expect(
      discoverAgentAuth({
        wwwAuthenticate: "Bearer",
        resourceUrl: "https://api.example.com/mcp",
        fetch: mockFetch(() =>
          jsonResponse({ ...prm, resource: "https://evil.example.com" }),
        ),
      }),
    ).rejects.toMatchObject({ code: "resource_mismatch" });
  });

  it("rejects issuer mismatches", async () => {
    const fetchMock = mockFetch((url) =>
      url.includes("oauth-authorization-server")
        ? jsonResponse({
            ...serverMetadata,
            issuer: "https://evil.example.com",
          })
        : routes(url),
    );
    await expect(
      discoverAgentAuth({
        wwwAuthenticate: "Bearer",
        resourceUrl: "https://api.example.com/mcp",
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: "issuer_mismatch" });
  });

  it("rejects a metadata response that was redirected to http", async () => {
    const redirected = jsonResponse(prm);
    Object.defineProperty(redirected, "url", {
      value: "http://api.example.com/meta",
    });
    await expect(
      discoverAgentAuth({
        wwwAuthenticate: 'Bearer resource_metadata="https://api.example.com/m"',
        resourceUrl: prm.resource,
        fetch: mockFetch(() => redirected),
      }),
    ).rejects.toMatchObject({ code: "invalid_url" });
  });

  it("accepts a metadata response redirected to another https url", async () => {
    const fetchMock = mockFetch((url) => {
      if (url !== "https://api.example.com/meta") return routes(url);
      const redirected = jsonResponse(prm);
      Object.defineProperty(redirected, "url", {
        value: "https://cdn.example.com/meta",
      });
      return redirected;
    });
    const result = await discoverAgentAuth({
      wwwAuthenticate:
        'Bearer resource_metadata="https://api.example.com/meta"',
      resourceUrl: prm.resource,
      fetch: fetchMock,
    });
    expect(result.resource).toBe(prm.resource);
  });

  it("rejects insecure metadata urls", async () => {
    await expect(
      discoverAgentAuth({
        wwwAuthenticate: 'Bearer resource_metadata="http://api.example.com/m"',
        resourceUrl: prm.resource,
        fetch: mockFetch(routes),
      }),
    ).rejects.toMatchObject({ code: "invalid_url" });
  });
});
