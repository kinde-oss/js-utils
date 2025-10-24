import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { getRolesSync, setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";
import { getRoles } from ".";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);
const storage = new MemoryStorage();

describe("getRoles", () => {
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
    await expect(getRoles()).rejects.toThrow("Authentication token not found.");
  });

  it("with token no roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ roles: undefined }),
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
      createMockAccessToken({ roles: undefined }),
    );

    await getRoles();
    expect(consoleMock).toHaveBeenCalledWith(
      "No roles found in token, ensure roles have been included in the token customisation within the application settings",
    );

    getClaimSpy.mockRestore();
  });

  it("with value and typed permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "01932730-c828-c01c-9f5d-c8f15be13e24",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );
    const idToken = await getRoles();

    expect(idToken).toStrictEqual([
      {
        id: "01932730-c828-c01c-9f5d-c8f15be13e24",
        key: "admin",
        name: "admin",
      },
    ]);
  });

  describe("forceApi option", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("when forceApi is true, should fetch roles from API", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "tokenAdmin", name: "Token Admin" }],
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

    it("when forceApi is false, should use token roles", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "tokenAdmin", name: "Token Admin" }],
        }),
      );

      const result = await getRoles({ forceApi: false });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual([
        { id: "1", key: "tokenAdmin", name: "Token Admin" },
      ]);
    });

    it("when forceApi is not provided but token has no roles, should call API", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({}), // No roles property at all
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

    it("when forceApi is not provided and token has roles, should use token", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "tokenAdmin", name: "Token Admin" }],
        }),
      );

      const result = await getRoles();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual([
        { id: "1", key: "tokenAdmin", name: "Token Admin" },
      ]);
    });

    it("when API returns empty roles array", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
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
        createMockAccessToken(),
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

    it("when API returns null data.roles", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          roles: null,
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await getRoles({ forceApi: true });

      expect(result).toEqual([]);
    });

    it("when API returns multiple roles with different properties", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
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

    it("when token has x-hasura-roles instead of roles", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: undefined,
          "x-hasura-roles": [
            { id: "1", key: "hasuraAdmin", name: "Hasura Admin" },
          ],
        }),
      );

      fetchMock.mockResponseOnce(
        JSON.stringify({
          data: {
            org_code: "org_123",
            roles: [{ id: "1", key: "hasuraAdmin", name: "Hasura Admin" }],
          },
        }),
      );

      const result = await getRoles();

      expect(result).toEqual([
        { id: "1", key: "hasuraAdmin", name: "Hasura Admin" },
      ]);
    });

    it("when forceApi is true and token has x-hasura-roles, should still use API", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: undefined,
          "x-hasura-roles": [
            { id: "1", key: "hasuraAdmin", name: "Hasura Admin" },
          ],
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

  it("when token exists but getDecodedToken returns null", async () => {
    // Mock getClaim to return a value so it doesn't go to API
    const getClaimSpy = vi
      .spyOn(await import("./getClaim"), "getClaim")
      .mockResolvedValue({ name: "roles", value: true });

    // Mock getDecodedToken to return null (simulating token decoding failure)
    const getDecodedTokenSpy = vi
      .spyOn(await import("./getDecodedToken"), "getDecodedToken")
      .mockResolvedValue(null);

    const result = await getRoles();
    expect(result).toEqual([]);

    getClaimSpy.mockRestore();
    getDecodedTokenSpy.mockRestore();
  });
});

describe("getRolesSync", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("returns [] when no token", () => {
    storage.removeSessionItem(StorageKeys.accessToken);
    expect(() => getRolesSync()).to.throw("Authentication token not found.");
  });

  it("returns roles from token", () => {
    storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "Admin" }],
      }),
    );
    const roles = getRolesSync();
    expect(roles).toStrictEqual([{ id: "1", key: "admin", name: "Admin" }]);
  });

  it("can't forceApi in sync request", () => {
    storage.removeSessionItem(StorageKeys.accessToken);
    expect(() => getRolesSync({ forceApi: true })).toThrow(
      "forceApi cannot be used in sync mode",
    );
  });
});
