import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { hasPermissions } from "./hasPermissions";

const storage = new MemoryStorage();

describe("hasPermissions", () => {
  beforeEach(() => {
    setActiveStorage(storage);
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
    const result = await hasPermissions({});

    expect(result).toBe(true);
  });

  it("when no params are provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );

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
        createMockAccessToken({ permissions: ["canEdit"] }),
      );

      const result = await hasPermissions({
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) => {
              return (
                permissionAccess.permissionKey === "canEdit" &&
                permissionAccess.isGranted
              ); // Check full permission access object
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
              return (
                permissionAccess.permissionKey === "canManage" &&
                permissionAccess.isGranted
              );
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
              return (
                permissionAccess.permissionKey.startsWith("admin") &&
                permissionAccess.isGranted
              );
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
              permissionAccess.permissionKey === "canDelete" &&
              permissionAccess.isGranted, // custom condition
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
              permissionAccess.permissionKey.includes("Edit") &&
              permissionAccess.isGranted, // passes
          },
          {
            permission: "canView",
            condition: async (permissionAccess) => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              return (
                permissionAccess.permissionKey.includes("View") &&
                permissionAccess.isGranted
              ); // passes
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
              return (
                permissionAccess.isGranted &&
                permissionAccess.orgCode === "org_123"
              );
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
              return (
                permissionAccess.permissionKey === "canEdit" &&
                !permissionAccess.isGranted
              );
            },
          },
        ],
      });

      expect(result).toBe(true); // Condition returns true even though permission is not granted
    });
  });
});
