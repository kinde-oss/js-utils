import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";
import { getRoles } from ".";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);
const storage = new MemoryStorage();

describe("getRoles - Hasura", () => {
  beforeEach(() => {
    setActiveStorage(storage);
    fetchMock.enableMocks();
  });

  afterEach(() => {
    fetchMock.resetMocks();
    vi.restoreAllMocks();
  });

  it("when no token", async () => {
    await storage.setSessionItem(StorageKeys.idToken, null);

    await expect(getRoles).rejects.toThrow("Authentication token not found.");
  });

  it("with token no roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ "x-hasura-roles": undefined }),
    );

    fetchMock.mockResponseOnce(
      JSON.stringify({
        data: {
          org_code: "org_123",
          roles: [],
        },
      }),
    );

    const idToken = await getRoles();
    expect(idToken).toStrictEqual([]);
  });

  it("warns when token no roles", async () => {
    const consoleMock = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    // Mock getClaim to return a value so it doesn't go to API
    const getClaimSpy = vi
      .spyOn(await import("./getClaim"), "getClaim")
      .mockResolvedValue({ name: "roles", value: true });

    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ roles: undefined, "x-hasura-roles": undefined }),
    );

    await getRoles({ forceApi: false });
    expect(consoleMock).toHaveBeenCalledWith(
      "No roles found in token, ensure roles have been included in the token customisation within the application settings",
    );

    getClaimSpy.mockRestore();
  });

  it("with value and typed permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ roles: null, "x-hasura-roles": ["admin"] }),
    );

    fetchMock.mockResponseOnce(
      JSON.stringify({
        data: {
          org_code: "org_123",
          roles: [{ id: "1", key: "admin", name: "Admin" }],
        },
      }),
    );

    const idToken = await getRoles();

    expect(idToken).toStrictEqual([{ id: "1", key: "admin", name: "Admin" }]);
  });
});
