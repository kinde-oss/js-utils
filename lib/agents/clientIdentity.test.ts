import { describe, expect, it } from "vitest";
import { registerClient, resolveClientIdentity } from "./clientIdentity";
import { jsonResponse, mockFetch, serverMetadata } from "./testUtils";

const registration = {
  clientName: "My Agent",
  redirectUris: ["https://app.example.com/callback"],
};
const cimdClientId = "https://app.example.com/client.json";
const preRegistered = { clientId: "pre-123" };

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
      preRegistered: { clientId: "pre-123", clientSecret: "s" },
      registration,
      fetch: dcrFetch(),
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

  it("requires client_id in the response", async () => {
    await expect(
      registerClient(serverMetadata.registration_endpoint, registration, {
        fetch: mockFetch(() => jsonResponse({})),
      }),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
});
