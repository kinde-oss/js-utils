import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { has } from "./has";

const storage = new MemoryStorage();

describe("has", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.removeItems(StorageKeys.accessToken);
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when no roles or permissions provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canEdit"],
      }),
    );
    const result = await has({});

    expect(result).toBe(true);
  });

  it("when only roles provided and user has all roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          { id: "1", key: "admin", name: "admin" },
          { id: "2", key: "user", name: "user" },
        ],
        permissions: ["canEdit"],
      }),
    );
    const result = await has({ roles: ["admin"] });

    expect(result).toBe(true);
  });

  it("when only roles provided and user missing roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "user", name: "user" }],
        permissions: ["canEdit"],
      }),
    );
    const result = await has({ roles: ["admin"] });

    expect(result).toBe(false);
  });

  it("when only permissions provided and user has all permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canEdit", "canDelete"],
      }),
    );
    const result = await has({ permissions: ["canEdit"] });

    expect(result).toBe(true);
  });

  it("when only permissions provided and user missing permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canView"],
      }),
    );
    const result = await has({ permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when both roles and permissions provided and user has both", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          { id: "1", key: "admin", name: "admin" },
          { id: "2", key: "user", name: "user" },
        ],
        permissions: ["canEdit", "canDelete", "canView"],
      }),
    );
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(true);
  });

  it("when both roles and permissions provided but user missing roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "user", name: "user" }],
        permissions: ["canEdit", "canDelete"],
      }),
    );
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when both roles and permissions provided but user missing permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canView"],
      }),
    );
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when both roles and permissions provided but user missing both", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "user", name: "user" }],
        permissions: ["canView"],
      }),
    );
    const result = await has({ roles: ["admin"], permissions: ["canEdit"] });

    expect(result).toBe(false);
  });

  it("when multiple roles and permissions required and user has all", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          { id: "1", key: "admin", name: "admin" },
          { id: "2", key: "user", name: "user" },
          { id: "3", key: "viewer", name: "viewer" },
        ],
        permissions: ["canEdit", "canDelete", "canView", "canCreate"],
      }),
    );
    const result = await has({
      roles: ["admin", "user"],
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(true);
  });

  it("when multiple roles and permissions required but user missing some roles", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "user", name: "user" }],
        permissions: ["canEdit", "canDelete", "canView"],
      }),
    );
    const result = await has({
      roles: ["admin", "user"],
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(false);
  });

  it("when multiple roles and permissions required but user missing some permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [
          { id: "1", key: "admin", name: "admin" },
          { id: "2", key: "user", name: "user" },
        ],
        permissions: ["canEdit"],
      }),
    );
    const result = await has({
      roles: ["admin", "user"],
      permissions: ["canEdit", "canDelete"],
    });

    expect(result).toBe(false);
  });

  it("when only feature flags provided and user has all feature flags", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canEdit"],
        feature_flags: {
          darkMode: { v: true, t: "b" },
          newDashboard: { v: "enabled", t: "s" },
        },
      }),
    );
    const result = await has({ featureFlags: ["darkMode"] });

    expect(result).toBe(true);
  });

  it("when only feature flags provided and user missing feature flags", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canEdit"],
        feature_flags: {
          otherFlag: { v: true, t: "b" },
        },
      }),
    );
    const result = await has({ featureFlags: ["darkMode"] });

    expect(result).toBe(false);
  });

  it("when roles, permissions, and feature flags all provided and user has all", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canEdit"],
        feature_flags: {
          darkMode: { v: true, t: "b" },
          newDashboard: { v: "enabled", t: "s" },
        },
      }),
    );
    const result = await has({
      roles: ["admin"],
      permissions: ["canEdit"],
      featureFlags: ["darkMode"],
    });

    expect(result).toBe(true);
  });

  it("when roles, permissions, and feature flags all provided but user missing feature flags", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        roles: [{ id: "1", key: "admin", name: "admin" }],
        permissions: ["canEdit"],
        feature_flags: {
          otherFlag: { v: true, t: "b" },
        },
      }),
    );
    const result = await has({
      roles: ["admin"],
      permissions: ["canEdit"],
      featureFlags: ["darkMode"],
    });

    expect(result).toBe(false);
  });

  describe("CustomCondition for Roles", () => {
    it("when role custom condition passes", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "Administrator" }],
          permissions: ["canEdit"],
        }),
      );

      const result = await has({
        roles: [
          {
            role: "admin",
            condition: (roleObj) => roleObj.name === "Administrator",
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when role custom condition fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
        }),
      );

      const result = await has({
        roles: [
          {
            role: "admin",
            condition: (roleObj) => roleObj.name === "Administrator",
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when mixing string roles and custom condition roles", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [
            { id: "1", key: "admin", name: "Administrator" },
            { id: "2", key: "user", name: "user" },
          ],
          permissions: ["canEdit"],
        }),
      );

      const result = await has({
        roles: [
          "user", // string role
          {
            role: "admin",
            condition: (roleObj) => roleObj.name === "Administrator", // custom condition
          },
        ],
      });

      expect(result).toBe(true);
    });
  });

  describe("CustomCondition for Permissions", () => {
    it("when permission custom condition passes", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
          org_code: "org_123",
        }),
      );

      const result = await has({
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) =>
              permissionAccess.isGranted &&
              permissionAccess.orgCode === "org_123",
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when permission custom condition fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
          org_code: "org_456",
        }),
      );

      const result = await has({
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) =>
              permissionAccess.isGranted &&
              permissionAccess.orgCode === "org_123",
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when mixing string permissions and custom condition permissions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit", "canView"],
          org_code: "org_123",
        }),
      );

      const result = await has({
        permissions: [
          "canView", // string permission
          {
            permission: "canEdit",
            condition: (permissionAccess) =>
              permissionAccess.isGranted &&
              permissionAccess.orgCode === "org_123", // custom condition
          },
        ],
      });

      expect(result).toBe(true);
    });
  });

  describe("FeatureFlagKVCondition", () => {
    it("when feature flag KV condition passes", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
          feature_flags: {
            theme: { v: "dark", t: "s" },
            maxUsers: { v: 100, t: "i" },
          },
        }),
      );

      const result = await has({
        featureFlags: [
          { flag: "theme", value: "dark" },
          { flag: "maxUsers", value: 100 },
        ],
      });

      expect(result).toBe(true);
    });

    it("when feature flag KV condition fails due to value mismatch", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
          feature_flags: {
            theme: { v: "dark", t: "s" },
          },
        }),
      );

      const result = await has({
        featureFlags: [
          { flag: "theme", value: "light" }, // value mismatch
        ],
      });

      expect(result).toBe(false);
    });

    it("when mixing string feature flags and KV conditions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
          feature_flags: {
            darkMode: { v: true, t: "b" },
            theme: { v: "blue", t: "s" },
          },
        }),
      );

      const result = await has({
        featureFlags: [
          "darkMode", // string flag
          { flag: "theme", value: "blue" }, // KV condition
        ],
      });

      expect(result).toBe(true);
    });
  });

  describe("Mixed Advanced Features", () => {
    it("when combining all advanced condition types and all pass", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "Administrator" }],
          permissions: ["canEdit"],
          org_code: "org_123",
          feature_flags: {
            theme: { v: "dark", t: "s" },
            darkMode: { v: true, t: "b" },
          },
        }),
      );

      const result = await has({
        roles: [
          {
            role: "admin",
            condition: (roleObj) => roleObj.name === "Administrator",
          },
        ],
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) =>
              permissionAccess.isGranted &&
              permissionAccess.orgCode === "org_123",
          },
        ],
        featureFlags: [
          "darkMode", // string flag
          { flag: "theme", value: "dark" }, // KV condition
        ],
      });

      expect(result).toBe(true);
    });

    it("when combining all advanced condition types but role condition fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
          org_code: "org_123",
          feature_flags: {
            theme: { v: "dark", t: "s" },
            darkMode: { v: true, t: "b" },
          },
        }),
      );

      const result = await has({
        roles: [
          {
            role: "admin",
            condition: (roleObj) => roleObj.name === "Administrator", // This will fail
          },
        ],
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) =>
              permissionAccess.isGranted &&
              permissionAccess.orgCode === "org_123",
          },
        ],
        featureFlags: ["darkMode", { flag: "theme", value: "dark" }],
      });

      expect(result).toBe(false);
    });

    it("when combining all advanced condition types but permission condition fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "Administrator" }],
          permissions: ["canEdit"],
          org_code: "org_456",
          feature_flags: {
            theme: { v: "dark", t: "s" },
            darkMode: { v: true, t: "b" },
          },
        }),
      );

      const result = await has({
        roles: [
          {
            role: "admin",
            condition: (roleObj) => roleObj.name === "Administrator",
          },
        ],
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) =>
              permissionAccess.isGranted &&
              permissionAccess.orgCode === "org_123", // This will fail
          },
        ],
        featureFlags: ["darkMode", { flag: "theme", value: "dark" }],
      });

      expect(result).toBe(false);
    });

    it("when combining all advanced condition types but feature flag condition fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "Administrator" }],
          permissions: ["canEdit"],
          org_code: "org_123",
          feature_flags: {
            theme: { v: "light", t: "s" },
            darkMode: { v: true, t: "b" },
          },
        }),
      );

      const result = await has({
        roles: [
          {
            role: "admin",
            condition: (roleObj) => roleObj.name === "Administrator",
          },
        ],
        permissions: [
          {
            permission: "canEdit",
            condition: (permissionAccess) =>
              permissionAccess.isGranted &&
              permissionAccess.orgCode === "org_123",
          },
        ],
        featureFlags: [
          "darkMode",
          { flag: "theme", value: "dark" }, // This will fail (value mismatch)
        ],
      });

      expect(result).toBe(false);
    });

    it("when using async custom conditions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "Administrator" }],
          permissions: ["canEdit"],
          org_code: "org_123",
        }),
      );

      const result = await has({
        roles: [
          {
            role: "admin",
            condition: async (roleObj) => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              return roleObj.name === "Administrator";
            },
          },
        ],
        permissions: [
          {
            permission: "canEdit",
            condition: async (permissionAccess) => {
              await new Promise((resolve) => setTimeout(resolve, 1));
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
  });
});
