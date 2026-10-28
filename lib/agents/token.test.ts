import { describe, expect, it } from "vitest";
import { exchangeCode, refreshAccessToken, revokeToken } from "./token";
import { jsonResponse, mockFetch, serverMetadata } from "./testUtils";

const tokenEndpoint = serverMetadata.token_endpoint;

describe("exchangeCode", () => {
  it("posts the authorization_code grant without openid artifacts", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({
        access_token: "at",
        token_type: "Bearer",
        refresh_token: "rt",
        expires_in: 60,
        scope: "read",
        id_token: "ignored",
      }),
    );
    const before = Date.now();
    const tokens = await exchangeCode({
      tokenEndpoint,
      clientId: "c1",
      code: "code1",
      codeVerifier: "v1",
      redirectUri: "https://app.example.com/callback",
      resource: "https://api.example.com/mcp",
      fetch: fetchMock,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(tokenEndpoint);
    expect(init.redirect).toBe("error");
    const body = new URLSearchParams(init.body as string);
    expect(Object.fromEntries(body)).toEqual({
      grant_type: "authorization_code",
      client_id: "c1",
      code: "code1",
      code_verifier: "v1",
      redirect_uri: "https://app.example.com/callback",
      resource: "https://api.example.com/mcp",
    });
    expect(tokens).toMatchObject({
      accessToken: "at",
      refreshToken: "rt",
      tokenType: "Bearer",
      expiresIn: 60,
      scope: "read",
    });
    expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 60000);
    expect(tokens).not.toHaveProperty("idToken");
  });

  it("sends client_secret only when provided", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ access_token: "at" }));
    await exchangeCode({
      tokenEndpoint,
      clientId: "c1",
      resource: "https://api.example.com/mcp",
      clientSecret: "sec",
      code: "x",
      codeVerifier: "v",
      redirectUri: "https://app.example.com/callback",
      fetch: fetchMock,
    });
    expect(
      new URLSearchParams(fetchMock.mock.calls[0][1].body as string).get(
        "client_secret",
      ),
    ).toBe("sec");
  });

  it("surfaces oauth errors", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse(
        { error: "invalid_grant", error_description: "expired" },
        { status: 400 },
      ),
    );
    await expect(
      exchangeCode({
        tokenEndpoint,
        clientId: "c1",
        resource: "https://api.example.com/mcp",
        code: "x",
        codeVerifier: "v",
        redirectUri: "https://app.example.com/callback",
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: "invalid_grant", status: 400 });
  });

  it("requires an access_token", async () => {
    await expect(
      exchangeCode({
        tokenEndpoint,
        clientId: "c1",
        resource: "https://api.example.com/mcp",
        code: "x",
        codeVerifier: "v",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch(() => jsonResponse({})),
      }),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
});

describe("refreshAccessToken", () => {
  it("keeps the old refresh token when none is rotated", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ access_token: "at2" }));
    const tokens = await refreshAccessToken({
      tokenEndpoint,
      clientId: "c1",
      resource: "https://api.example.com/mcp",
      refreshToken: "rt1",
      fetch: fetchMock,
    });
    expect(fetchMock.mock.calls[0][1].redirect).toBe("error");
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("rt1");
    expect(body.get("resource")).toBe("https://api.example.com/mcp");
    expect(tokens.refreshToken).toBe("rt1");
  });

  it("uses a rotated refresh token", async () => {
    const tokens = await refreshAccessToken({
      tokenEndpoint,
      clientId: "c1",
      resource: "https://api.example.com/mcp",
      refreshToken: "rt1",
      fetch: mockFetch(() =>
        jsonResponse({ access_token: "at2", refresh_token: "rt2" }),
      ),
    });
    expect(tokens.refreshToken).toBe("rt2");
  });

  it("sends the normalized scope", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ access_token: "at2" }));
    await refreshAccessToken({
      tokenEndpoint,
      clientId: "c1",
      resource: "https://api.example.com/mcp",
      refreshToken: "rt1",
      scope: " read  write read ",
      fetch: fetchMock,
    });
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
    expect(body.get("scope")).toBe("read write");
  });

  it("omits scope when none is given", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ access_token: "at2" }));
    await refreshAccessToken({
      tokenEndpoint,
      clientId: "c1",
      resource: "https://api.example.com/mcp",
      refreshToken: "rt1",
      fetch: fetchMock,
    });
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
    expect(body.has("scope")).toBe(false);
  });

  it.each(["openid", "read openid", "openid read write"])(
    "refuses the openid scope %j without calling fetch",
    async (scope) => {
      const fetchMock = mockFetch(() => jsonResponse({ access_token: "at2" }));
      await expect(
        refreshAccessToken({
          tokenEndpoint,
          clientId: "c1",
          resource: "https://api.example.com/mcp",
          refreshToken: "rt1",
          scope,
          fetch: fetchMock,
        }),
      ).rejects.toMatchObject({ code: "openid_scope_not_allowed" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects insecure endpoints", async () => {
    await expect(
      refreshAccessToken({
        tokenEndpoint: "http://auth.example.com/token",
        clientId: "c1",
        resource: "https://api.example.com/mcp",
        refreshToken: "rt",
        fetch: mockFetch(() => jsonResponse({})),
      }),
    ).rejects.toMatchObject({ code: "invalid_url" });
  });
});

describe("revokeToken", () => {
  it("posts token and hint", async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 200 }));
    await revokeToken({
      revocationEndpoint: serverMetadata.revocation_endpoint,
      clientId: "c1",
      token: "rt1",
      tokenTypeHint: "refresh_token",
      fetch: fetchMock,
    });
    expect(fetchMock.mock.calls[0][1].redirect).toBe("error");
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
    expect(Object.fromEntries(body)).toEqual({
      token: "rt1",
      token_type_hint: "refresh_token",
      client_id: "c1",
    });
  });

  it("fails without an endpoint or on server error", async () => {
    await expect(
      revokeToken({ clientId: "c1", token: "t" }),
    ).rejects.toMatchObject({ code: "no_revocation_endpoint" });
    await expect(
      revokeToken({
        revocationEndpoint: serverMetadata.revocation_endpoint,
        clientId: "c1",
        token: "t",
        fetch: mockFetch(() => new Response(null, { status: 500 })),
      }),
    ).rejects.toMatchObject({ status: 500 });
  });
});
