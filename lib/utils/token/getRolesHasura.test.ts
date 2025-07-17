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
    await storage.removeSessionItem(StorageKeys.accessToken);

    await expect(getRoles).rejects.toThrow("Authentication token not found.");
  });

  it("calls API when token has no roles claim", async () => {
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

    const roles = await getRoles();
    expect(roles).toStrictEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://kinde.com/account_api/v1/roles",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Bearer"),
          "Content-Type": "application/json",
        }),
      }),
    );
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

  describe("forceApi option", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("when forceApi is true, should fetch roles from API", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: undefined,
          "x-hasura-roles": [
            { id: "1", key: "tokenAdmin", name: "Token Admin" },
          ],
        }),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          roles: [
            { id: "2", key: "apiAdmin", name: "API Administrator" },
            { id: "3", key: "apiUser", name: "API User" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await getRoles({ forceApi: true });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
            "Content-Type": "application/json",
          }),
        }),
      );

      expect(result).toEqual([
        { id: "2", key: "apiAdmin", name: "API Administrator" },
        { id: "3", key: "apiUser", name: "API User" },
      ]);
    });

    it("when forceApi is false, should use token x-hasura-roles", async () => {
      // Mock getClaim to return a value so it doesn't go to API
      const getClaimSpy = vi
        .spyOn(await import("./getClaim"), "getClaim")
        .mockResolvedValue({ name: "roles", value: true });

      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: undefined,
          "x-hasura-roles": [
            { id: "1", key: "tokenAdmin", name: "Token Admin" },
          ],
        }),
      );

      const result = await getRoles({ forceApi: false });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual([
        { id: "1", key: "tokenAdmin", name: "Token Admin" },
      ]);

      getClaimSpy.mockRestore();
    });

    it("when forceApi is not provided but token has no x-hasura-roles, should call API", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: undefined,
          "x-hasura-roles": undefined,
        }),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          roles: [{ id: "1", key: "apiAdmin", name: "API Administrator" }],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await getRoles();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({
          method: "GET",
        }),
      );

      expect(result).toEqual([
        { id: "1", key: "apiAdmin", name: "API Administrator" },
      ]);
    });

    it("when forceApi is not provided and token has x-hasura-roles, should use token", async () => {
      // Mock getClaim to return a value so it doesn't go to API
      const getClaimSpy = vi
        .spyOn(await import("./getClaim"), "getClaim")
        .mockResolvedValue({ name: "roles", value: true });

      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: undefined,
          "x-hasura-roles": [
            { id: "1", key: "tokenAdmin", name: "Token Admin" },
          ],
        }),
      );

      const result = await getRoles();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual([
        { id: "1", key: "tokenAdmin", name: "Token Admin" },
      ]);

      getClaimSpy.mockRestore();
    });

    it("when API returns empty roles array", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: undefined,
          "x-hasura-roles": undefined,
        }),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          roles: [],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await getRoles({ forceApi: true });

      expect(result).toEqual([]);
    });

    it("when API request fails, should throw error", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: undefined,
          "x-hasura-roles": undefined,
        }),
      );

      fetchMock.mockResponse({
        status: 401,
        statusText: "Unauthorized",
        json: vi.fn(),
      });

      await expect(getRoles({ forceApi: true })).rejects.toThrow(
        "API request failed with status 401",
      );
    });

    it("when API returns multiple roles with different properties", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: undefined,
          "x-hasura-roles": undefined,
        }),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_456",
          roles: [
            { id: "role_1", key: "super_admin", name: "Super Administrator" },
            { id: "role_2", key: "editor", name: "Content Editor" },
            { id: "role_3", key: "viewer", name: "Read Only User" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await getRoles({ forceApi: true });

      expect(result).toEqual([
        { id: "role_1", key: "super_admin", name: "Super Administrator" },
        { id: "role_2", key: "editor", name: "Content Editor" },
        { id: "role_3", key: "viewer", name: "Read Only User" },
      ]);
    });

    it("when token has roles instead of x-hasura-roles", async () => {
      // Mock getClaim to return a value so it doesn't go to API
      const getClaimSpy = vi
        .spyOn(await import("./getClaim"), "getClaim")
        .mockResolvedValue({ name: "roles", value: true });

      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "regularAdmin", name: "Regular Admin" }],
          "x-hasura-roles": undefined,
        }),
      );

      const result = await getRoles();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual([
        { id: "1", key: "regularAdmin", name: "Regular Admin" },
      ]);

      getClaimSpy.mockRestore();
    });

    it("when forceApi is true and token has roles, should still use API", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "regularAdmin", name: "Regular Admin" }],
          "x-hasura-roles": undefined,
        }),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_789",
          roles: [{ id: "2", key: "apiSuperAdmin", name: "API Super Admin" }],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await getRoles({ forceApi: true });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({
          method: "GET",
        }),
      );

      expect(result).toEqual([
        { id: "2", key: "apiSuperAdmin", name: "API Super Admin" },
      ]);
    });
  });
});
