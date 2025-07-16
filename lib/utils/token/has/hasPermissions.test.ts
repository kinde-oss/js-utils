import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { hasPermissions } from "./hasPermissions";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);
const storage = new MemoryStorage();

describe("hasPermissions", () => {
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
    const result = await hasPermissions({ permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when no permissions provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );

    // @ts-expect-error - no params provided
    const result = await hasPermissions({});

    expect(result).toBe(true);
  });

  it("when no params are provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );

    // @ts-expect-error - no params provided
    const result = await hasPermissions();

    expect(result).toBe(true);
  });

  it("when empty permissions array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const result = await hasPermissions({ permissions: [] });

    expect(result).toBe(true);
  });

  it("when user has all required permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        permissions: ["canEdit", "canDelete", "canView"],
      }),
    );
    const result = await hasPermissions({
      permissions: ["canEdit", "canView"],
    });

    expect(result).toBe(true);
  });

  it("when user has some but not all required permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const result = await hasPermissions({
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(false);
  });

  it("when user has no required permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canView"] }),
    );
    const result = await hasPermissions({
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(false);
  });

  it("when user has single required permission", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const result = await hasPermissions({ permissions: ["canEdit"] });

    expect(result).toBe(true);
  });

  it("when token has no permissions array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: null }),
    );
    const result = await hasPermissions({ permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  describe("CustomCondition", () => {
    it("when sync custom condition returns true", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          permissions: ["canEdit"],
          org_code: "org_123",
        }),
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) => {
              return permissionAccess.permissionKey === "canEdit";
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when sync custom condition returns false", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({ permissions: ["canEdit"] }),
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "canEdit",
            condition: () => false, // Always false
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when async custom condition returns true", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({ permissions: ["canManage"] }),
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "canManage",
            condition: async (permissionAccess) => {
              // Simulate async operation
              await new Promise((resolve) => setTimeout(resolve, 1));
              return permissionAccess.permissionKey === "canManage";
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when async custom condition returns false", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({ permissions: ["canView"] }),
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "canView",
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

    it("when custom condition can access the full permission access object", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({ permissions: ["adminEdit"] }),
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "adminEdit",
            condition: (permissionAccess) => {
              // Custom logic based on permission access object properties
              return permissionAccess.permissionKey.startsWith("admin");
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when combining string permissions and custom conditions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({ permissions: ["canEdit", "canDelete"] }),
      );

      const result = await hasPermissions({
        permissions: [
          "canEdit", // string permission - check existence
          {
            permission: "canDelete",
            condition: (permissionAccess) =>
              permissionAccess.permissionKey === "canDelete",
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when one condition fails in mixed types", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({ permissions: ["canEdit"] }),
      );

      const result = await hasPermissions({
        permissions: [
          "canEdit", // string permission - passes
          {
            permission: "canDelete",
            condition: () => false, // custom condition - fails
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when multiple custom conditions with different results", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({ permissions: ["canEdit", "canView"] }),
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "canEdit",
            condition: () => true, // passes
          },
          {
            permission: "canView",
            condition: () => false, // fails
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when all custom conditions pass", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          permissions: ["canEdit", "canView", "canDelete"],
        }),
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) =>
              permissionAccess.permissionKey.includes("Edit"),
          },
          {
            permission: "canView",
            condition: async (permissionAccess) => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              return permissionAccess.permissionKey.includes("View"); // passes
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when custom condition can evaluate orgCode", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          permissions: ["canEdit"],
          org_code: "org_123",
        }),
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) => {
              // Custom logic based on org code
              return permissionAccess.orgCode === "org_123";
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when custom condition checks non-granted permission", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({ permissions: ["canView"] }), // User doesn't have canEdit
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) => {
              // Even though permission is not granted, condition can still evaluate it
              return permissionAccess.permissionKey === "canEdit";
            },
          },
        ],
      });

      expect(result).toBe(false); // Custom condition is not called when permission is not granted
    });
  });

  describe("forceApi option", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("when forceApi is true and permissions are fetched from API", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          permissions: [
            { id: "1", name: "Can Edit", key: "apiCanEdit" },
            { id: "2", name: "Can View", key: "apiCanView" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasPermissions({
        permissions: ["apiCanEdit"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/permissions",
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

    it("when forceApi is false and permissions are read from token", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          permissions: ["tokenCanEdit"],
        }),
      );

      const result = await hasPermissions({
        permissions: ["tokenCanEdit"],
        forceApi: false,
      });

      expect(result).toBe(true);
    });

    it("when forceApi is not provided and defaults to token behavior", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          permissions: ["defaultCanEdit"],
        }),
      );

      const result = await hasPermissions({
        permissions: ["defaultCanEdit"],
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
          org_code: "org_456",
          permissions: [{ id: "1", name: "Can Manage", key: "apiCanManage" }],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasPermissions({
        permissions: [
          {
            permission: "apiCanManage",
            condition: (permissionAccess) => {
              return permissionAccess.orgCode === "org_456";
            },
          },
        ],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/permissions",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(true);
    });

    it("when forceApi is true but API returns no matching permissions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          permissions: [
            { id: "1", name: "Other Permission", key: "otherPermission" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasPermissions({
        permissions: ["nonExistentPermission"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/permissions",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(false);
    });

    it("when forceApi is true and API returns empty permissions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_123",
          permissions: [],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasPermissions({
        permissions: ["anyPermission"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/permissions",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(false);
    });

    it("when forceApi is true with mixed permission types", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          org_code: "org_789",
          permissions: [
            { id: "1", name: "Can Edit", key: "apiCanEdit" },
            { id: "2", name: "Can View", key: "apiCanView" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasPermissions({
        permissions: [
          "apiCanEdit", // string permission
          {
            permission: "apiCanView",
            condition: (permissionAccess) =>
              permissionAccess.orgCode === "org_789",
          },
        ],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/permissions",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(true);
    });

    it("when forceApi is true and API request fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      fetchMock.mockResponse({
        status: 403,
        statusText: "Forbidden",
        json: vi.fn(),
      });

      await expect(
        hasPermissions({
          permissions: ["anyPermission"],
          forceApi: true,
        }),
      ).rejects.toThrow("API request failed with status 403");
    });
  });
});
