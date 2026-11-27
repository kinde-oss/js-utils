import { describe, expect, it } from "vitest";
import { registerClient, resolveClientIdentity } from "./clientIdentity";
import { jsonResponse, mockFetch, serverMetadata } from "./testUtils";

const registration = {
  clientName: "My Agent",
  redirectUris: ["https://app.example.com/callback"],
};
const cimdClientId = "https://app.example.com/client.json";
const preRegistered = {
  issuer: serverMetadata.issuer,
  clientId: "pre-123",
};

const dcrFetch = () =>
  mockFetch(() => jsonResponse({ client_id: "dcr-1" }, { status: 201 }));

describe("resolveClientIdentity", () => {
  it("prefers CIMD when supported", async () => {
    const fetchMock = dcrFetch();
    const identity = await resolveClientIdentity({
      authorizationServer: serverMetadata,
      cimdClientId,
      preRegistered,
      registration,
      fetch: fetchMock,
    });
    expect(identity).toEqual({ method: "cimd", clientId: cimdClientId });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses pre-registered when CIMD is unsupported", async () => {
    const identity = await resolveClientIdentity({
      authorizationServer: {
        ...serverMetadata,
        client_id_metadata_document_supported: false,
      },
      cimdClientId,
      preRegistered: { ...preRegistered, clientSecret: "s" },
      registration,
      fetch: dcrFetch(),
    });
    expect(identity).toEqual({
      method: "preregistered",
      clientId: "pre-123",
      clientSecret: "s",
    });
  });

  it("does not use pre-registered credentials issued for another authorization server", async () => {
    const fetchMock = dcrFetch();
    const identity = await resolveClientIdentity({
      authorizationServer: {
        ...serverMetadata,
        client_id_metadata_document_supported: false,
      },
      preRegistered: {
        issuer: "https://other.example.com",
        clientId: "pre-123",
        clientSecret: "s",
      },
      registration,
      fetch: fetchMock,
    });
    expect(identity).toEqual({ method: "dcr", clientId: "dcr-1" });
    expect(JSON.stringify(identity)).not.toContain("pre-123");
  });

  it("fails instead of leaking credentials when no other identity is available", async () => {
    await expect(
      resolveClientIdentity({
        authorizationServer: {
          ...serverMetadata,
          client_id_metadata_document_supported: false,
          registration_endpoint: undefined,
        },
        preRegistered: {
          issuer: "https://other.example.com",
          clientId: "pre-123",
          clientSecret: "s",
        },
      }),
    ).rejects.toMatchObject({ code: "no_client_identity" });
  });

  it.each([
    ["https://auth.example.com/tenant", "https://auth.example.com/tenant/"],
    ["https://auth.example.com/tenant/", "https://auth.example.com/tenant"],
    ["https://auth.example.com", "https://auth.example.com/"],
    ["https://auth.example.com/tenant", "https://AUTH.example.com/tenant"],
  ])(
    "requires an exact issuer match: %s vs %s",
    async (serverIssuer, registeredIssuer) => {
      const authorizationServer = {
        ...serverMetadata,
        issuer: serverIssuer,
        client_id_metadata_document_supported: false,
      };
      const preRegisteredClient = {
        issuer: registeredIssuer,
        clientId: "pre-123",
        clientSecret: "s",
      };

      await expect(
        resolveClientIdentity({
          authorizationServer,
          preRegistered: preRegisteredClient,
        }),
      ).rejects.toMatchObject({ code: "no_client_identity" });

      const identity = await resolveClientIdentity({
        authorizationServer,
        preRegistered: preRegisteredClient,
        registration,
        fetch: dcrFetch(),
      });
      expect(identity).toEqual({ method: "dcr", clientId: "dcr-1" });
    },
  );

  it("uses pre-registered credentials when the issuer is identical", async () => {
    const identity = await resolveClientIdentity({
      authorizationServer: {
        ...serverMetadata,
        issuer: "https://auth.example.com/tenant/",
        client_id_metadata_document_supported: false,
      },
      preRegistered: {
        issuer: "https://auth.example.com/tenant/",
        clientId: "pre-123",
        clientSecret: "s",
      },
    });
    expect(identity).toEqual({
      method: "preregistered",
      clientId: "pre-123",
      clientSecret: "s",
    });
  });

  it("falls back to DCR", async () => {
    const fetchMock = dcrFetch();
    const identity = await resolveClientIdentity({
      authorizationServer: {
        ...serverMetadata,
        client_id_metadata_document_supported: undefined,
      },
      cimdClientId,
      registration,
      fetch: fetchMock,
    });
    expect(identity).toEqual({ method: "dcr", clientId: "dcr-1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(serverMetadata.registration_endpoint);
    expect(init.redirect).toBe("error");
    const body = JSON.parse(init.body as string);
    expect(body.token_endpoint_auth_method).toBe("none");
    expect(body.scope).toBeUndefined();
  });

  it("throws when nothing is usable", async () => {
    await expect(
      resolveClientIdentity({
        authorizationServer: {
          ...serverMetadata,
          registration_endpoint: undefined,
        },
        registration,
      }),
    ).rejects.toMatchObject({ code: "no_client_identity" });
  });
});

describe("registerClient", () => {
  it("blocks a registration endpoint on a private address", async () => {
    const fetchMock = dcrFetch();
    await expect(
      registerClient("https://10.0.0.5/register", registration, {
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: "private_network_blocked" });
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(
      registerClient("https://10.0.0.5/register", registration, {
        fetch: fetchMock,
        allowPrivateNetworks: true,
      }),
    ).resolves.toMatchObject({ method: "dcr", clientId: "dcr-1" });
  });

  it.each(["client_secret_basic", "client_secret_jwt", "private_key_jwt"])(
    "rejects the unsupported auth method %s before registering",
    async (tokenEndpointAuthMethod) => {
      const fetchMock = dcrFetch();
      await expect(
        registerClient(
          serverMetadata.registration_endpoint,
          { ...registration, tokenEndpointAuthMethod },
          { fetch: fetchMock },
        ),
      ).rejects.toMatchObject({ code: "unsupported_token_auth_method" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(["none", "client_secret_post"])(
    "registers with the supported auth method %s",
    async (tokenEndpointAuthMethod) => {
      const fetchMock = mockFetch(() =>
        jsonResponse(
          {
            client_id: "dcr-1",
            token_endpoint_auth_method: tokenEndpointAuthMethod,
            ...(tokenEndpointAuthMethod === "client_secret_post" && {
              client_secret: "s",
            }),
          },
          { status: 201 },
        ),
      );
      await registerClient(
        serverMetadata.registration_endpoint,
        { ...registration, tokenEndpointAuthMethod },
        { fetch: fetchMock },
      );
      const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(sent.token_endpoint_auth_method).toBe(tokenEndpointAuthMethod);
    },
  );

  it.each([undefined, "", null])(
    "rejects an assigned client_secret_post without a usable client_secret (%j)",
    async (clientSecret) => {
      await expect(
        registerClient(serverMetadata.registration_endpoint, registration, {
          fetch: mockFetch(() =>
            jsonResponse({
              client_id: "dcr-1",
              token_endpoint_auth_method: "client_secret_post",
              ...(clientSecret !== undefined && {
                client_secret: clientSecret,
              }),
            }),
          ),
        }),
      ).rejects.toMatchObject({ code: "invalid_response" });
    },
  );

  it("accepts a secret-free response assigned the none method", async () => {
    await expect(
      registerClient(serverMetadata.registration_endpoint, registration, {
        fetch: mockFetch(() =>
          jsonResponse({
            client_id: "dcr-1",
            token_endpoint_auth_method: "none",
          }),
        ),
      }),
    ).resolves.toEqual({ method: "dcr", clientId: "dcr-1" });
  });

  it("refuses a registration whose assigned auth method is unsupported", async () => {
    await expect(
      registerClient(serverMetadata.registration_endpoint, registration, {
        fetch: mockFetch(() =>
          jsonResponse({
            client_id: "dcr-1",
            client_secret: "s",
            token_endpoint_auth_method: "client_secret_basic",
          }),
        ),
      }),
    ).rejects.toMatchObject({ code: "unsupported_token_auth_method" });
  });

  it("reports the HTTP status when a failed registration body is not valid UTF-8", async () => {
    await expect(
      registerClient(serverMetadata.registration_endpoint, registration, {
        fetch: mockFetch(
          () =>
            new Response(new Uint8Array([0xff, 0xfe]) as unknown as BodyInit, {
              status: 502,
            }),
        ),
      }),
    ).rejects.toMatchObject({ code: "http_error", status: 502 });
  });

  it("rejects openid inside a multi-scope array entry", async () => {
    const fetchMock = dcrFetch();
    await expect(
      registerClient(
        serverMetadata.registration_endpoint,
        { ...registration, scope: ["read openid"] },
        { fetch: fetchMock },
      ),
    ).rejects.toMatchObject({ code: "openid_scope_not_allowed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects openid scope", async () => {
    await expect(
      registerClient(
        serverMetadata.registration_endpoint,
        { ...registration, scope: "openid" },
        { fetch: dcrFetch() },
      ),
    ).rejects.toMatchObject({ code: "openid_scope_not_allowed" });
  });

  it("surfaces server errors", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse(
        { error: "invalid_redirect_uri", error_description: "bad" },
        { status: 400 },
      ),
    );
    await expect(
      registerClient(serverMetadata.registration_endpoint, registration, {
        fetch: fetchMock,
      }),
    ).rejects.toMatchObject({ code: "invalid_redirect_uri", status: 400 });
  });

  it.each([
    ["an object client_id", { client_id: { value: "dcr-1" } }],
    ["a numeric client_id", { client_id: 7 }],
    ["an empty client_id", { client_id: "" }],
    ["a non-string client_secret", { client_id: "a", client_secret: 1 }],
    [
      "a non-string registration_access_token",
      { client_id: "a", registration_access_token: {} },
    ],
    [
      "a non-string registration_client_uri",
      { client_id: "a", registration_client_uri: ["x"] },
    ],
    [
      "a non-string token_endpoint_auth_method",
      { client_id: "a", token_endpoint_auth_method: 5 },
    ],
    ["an array body", ["a"]],
    ["a null body", null],
  ])("rejects a registration response with %s", async (_name, body) => {
    await expect(
      registerClient(serverMetadata.registration_endpoint, registration, {
        fetch: mockFetch(() => jsonResponse(body)),
      }),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("returns the registration credentials when they are strings", async () => {
    await expect(
      registerClient(serverMetadata.registration_endpoint, registration, {
        fetch: mockFetch(() =>
          jsonResponse({
            client_id: "dcr-1",
            client_secret: "s",
            registration_access_token: "t",
            registration_client_uri: "https://auth.example.com/register/dcr-1",
          }),
        ),
      }),
    ).resolves.toEqual({
      method: "dcr",
      clientId: "dcr-1",
      clientSecret: "s",
      registrationAccessToken: "t",
      registrationClientUri: "https://auth.example.com/register/dcr-1",
    });
  });

  it("requires client_id in the response", async () => {
    await expect(
      registerClient(serverMetadata.registration_endpoint, registration, {
        fetch: mockFetch(() => jsonResponse({})),
      }),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
});
