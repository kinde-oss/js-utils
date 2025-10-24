import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { hasRoles } from "./hasRoles";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);
const storage = new MemoryStorage();

describe("hasRoles", () => {
  beforeEach(() => {
    setActiveStorage(storage);
    fetchMock.enableMocks();
  });

  afterEach(() => {
    fetchMock.resetMocks();
    vi.restoreAllMocks();
  });

  it("when no token", async () => {
    storage.removeSessionItem(StorageKeys.accessToken);

    try {
      const result = await hasRoles({ roles: ["admin"] });
      expect(result).toBe(false);
    } catch (error) {
      // Expect either false result or an authentication error
      expect(error).toBeDefined();
    }
  });

  it("when no roles provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );

    // @ts-expect-error - no params provided
    const result = await hasRoles({});

    expect(result).toBe(true);
  });

  it("when no params are provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );

    // @ts-expect-error - no params provided
    const result = await hasRoles();

    expect(result).toBe(true);
  });

  it("when empty roles array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: [] });

    expect(result).toBe(true);
  });

  it("when user has all required roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
          {
            id: "2",
            key: "user",
            name: "user",
          },
          {
            id: "3",
            key: "viewer",
            name: "viewer",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: ["admin", "user"] });

    expect(result).toBe(true);
  });

  it("when user has some but not all required roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: ["admin", "user"] });

    expect(result).toBe(false);
  });

  it("when user has no required roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "viewer",
            name: "viewer",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: ["admin", "user"] });

    expect(result).toBe(false);
  });

  it("when user has single required role", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          {
            id: "1",
            key: "admin",
            name: "admin",
          },
        ],
      }),
    );
    const result = await hasRoles({ roles: ["admin"] });

    expect(result).toBe(true);
  });

  it("when token has no roles", async () => {
    const consoleMock = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    // Mock getClaim to return a value so it doesn't go to API
    const getClaimSpy = vi
      .spyOn(await import("../getClaim"), "getClaim")
      .mockResolvedValue({ name: "roles", value: true });

    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ roles: undefined }),
    );

    const result = await hasRoles({ roles: ["admin"] });

    expect(result).toBe(false);
    expect(consoleMock).toHaveBeenCalledWith(
      "No roles found in token, ensure roles have been included in the token customisation within the application settings",
    );

    getClaimSpy.mockRestore();
  });

  describe("CustomCondition", () => {
    it("when sync custom condition returns true", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "admin",
              name: "admin",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          {
            role: "admin",
            condition: (roleObj) => {
              return roleObj.key === "admin" && roleObj.name === "admin"; // Check full role object
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when sync custom condition returns false", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "admin",
              name: "admin",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          {
            role: "admin",
            condition: () => false, // Always false
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when async custom condition returns true", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "moderator",
              name: "moderator",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          {
            role: "moderator",
            condition: async (roleObj) => {
              // Simulate async operation
              await new Promise((resolve) => setTimeout(resolve, 1));
              return roleObj.key === "moderator";
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when async custom condition returns false", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "user",
              name: "user",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          {
            role: "user",
            condition: async () => {
              // Simulate async operation
              await new Promise((resolve) => setTimeout(resolve, 1));
              return false;
            },
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when custom condition can access the full role object", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "superAdmin",
              name: "Super Administrator",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          {
            role: "superAdmin",
            condition: (roleObj) => {
              // Custom logic based on role object properties
              return (
                roleObj.key.includes("Admin") &&
                roleObj.name.includes("Administrator")
              );
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when combining string roles and custom conditions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "admin",
              name: "admin",
            },
            {
              id: "2",
              key: "editor",
              name: "editor",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          "admin", // string role - check existence
          {
            role: "editor",
            condition: (roleObj) => roleObj.key === "editor", // custom condition
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when one condition fails in mixed types", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "admin",
              name: "admin",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          "admin", // string role - passes
          {
            role: "editor",
            condition: () => false, // custom condition - fails (role doesn't exist, so condition won't be called)
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when custom condition evaluates role that doesn't exist", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "admin",
              name: "admin",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: [
          {
            role: "nonExistentRole",
            condition: () => true, // This won't be called because role doesn't exist
          },
        ],
      });

      expect(result).toBe(false);
    });
  });

  describe("forceApi option", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("when forceApi is true and roles are fetched from API", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          roles: [
            { id: "1", key: "apiAdmin", name: "API Administrator" },
            { id: "2", key: "apiUser", name: "API User" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasRoles({
        roles: ["apiAdmin"],
        forceApi: true,
      });

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
      expect(result).toBe(true);
    });

    it("when forceApi is false and roles are read from token", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "tokenAdmin",
              name: "Token Administrator",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: ["tokenAdmin"],
        forceApi: false,
      });

      expect(result).toBe(true);
    });

    it("when forceApi is not provided and defaults to token behavior", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            {
              id: "1",
              key: "defaultAdmin",
              name: "Default Administrator",
            },
          ],
        }),
      );

      const result = await hasRoles({
        roles: ["defaultAdmin"],
      });

      expect(result).toBe(true);
    });

    it("when forceApi is true with custom conditions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          roles: [
            { id: "1", key: "apiSuperAdmin", name: "API Super Administrator" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasRoles({
        roles: [
          {
            role: "apiSuperAdmin",
            condition: (roleObj) => {
              return (
                roleObj.key.includes("Admin") &&
                roleObj.name.includes("Administrator")
              );
            },
          },
        ],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(true);
    });

    it("when forceApi is true but API returns no matching roles", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          roles: [{ id: "1", key: "otherRole", name: "Other Role" }],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasRoles({
        roles: ["nonExistentRole"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(false);
    });

    it("when forceApi is true and API returns empty roles", async () => {
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

      const result = await hasRoles({
        roles: ["anyRole"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(false);
    });

    it("when forceApi is true with mixed role types", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          roles: [
            { id: "1", key: "apiAdmin", name: "API Administrator" },
            { id: "2", key: "apiEditor", name: "API Editor" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasRoles({
        roles: [
          "apiAdmin", // string role
          {
            role: "apiEditor",
            condition: (roleObj) => roleObj.key === "apiEditor",
          },
        ],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(true);
    });

    it("when forceApi is true and custom condition fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          roles: [{ id: "1", key: "apiUser", name: "API User" }],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasRoles({
        roles: [
          {
            role: "apiUser",
            condition: (roleObj) => roleObj.key.includes("Admin"), // fails
          },
        ],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(false);
    });

    it("when forceApi is true and API request fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      fetchMock.mockResponse({
        status: 401,
        statusText: "Unauthorized",
        json: vi.fn(),
      });

      const result = await hasRoles({
        roles: ["anyRole"],
        forceApi: true,
      });

      expect(result).toBe(false);
    });
  });
});
