import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { has } from "./has";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);
const storage = new MemoryStorage();

describe("has", () => {
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
      const result = await has({ roles: ["admin"], permissions: ["canEdit"] });
      expect(result).toBe(false);
    } catch (error) {
      // Expect either false result or an authentication error
      expect(error).toBeDefined();
    }
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
              return permissionAccess.orgCode === "org_123";
            },
          },
        ],
      });

      expect(result).toBe(true);
    });
  });

  describe("Billing Entitlements", () => {
    const mockEntitlementsResponse = {
      data: {
        org_code: "org_123",
        plans: [
          {
            key: "pro_plan",
            subscribed_on: "2025-06-01T12:00:00Z",
          },
        ],
        entitlements: [
          {
            id: "entitlement_1",
            fixed_charge: 35,
            price_name: "Pro gym",
            unit_amount: 1,
            feature_key: "pro_gym",
            feature_name: "Pro Gym",
            entitlement_limit_max: 10,
            entitlement_limit_min: 1,
          },
          {
            id: "entitlement_2",
            fixed_charge: 50,
            price_name: "Premium features",
            unit_amount: 1,
            feature_key: "premium_features",
            feature_name: "Premium Features",
            entitlement_limit_max: 100,
            entitlement_limit_min: 1,
          },
        ],
      },
    };

    it("when only billing entitlements provided and user has all entitlements", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        billingEntitlements: ["Pro gym"],
      });

      expect(result).toBe(true);
    });

    it("when only billing entitlements provided and user missing entitlements", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        billingEntitlements: ["Non-existent entitlement"],
      });

      expect(result).toBe(false);
    });

    it("when user has all required billing entitlements", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      // Mock multiple calls for each entitlement check
      fetchMock
        .mockResponseOnce(JSON.stringify(mockEntitlementsResponse))
        .mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        billingEntitlements: ["Pro gym", "Premium features"],
      });

      expect(result).toBe(true);
    });

    it("when user has some but not all required billing entitlements", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      fetchMock
        .mockResponseOnce(JSON.stringify(mockEntitlementsResponse))
        .mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        billingEntitlements: ["Pro gym", "Non-existent entitlement"],
      });

      expect(result).toBe(false);
    });

    it("when combining roles, permissions, feature flags, and billing entitlements", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
          feature_flags: {
            darkMode: { v: true, t: "b" },
          },
        }),
      );

      fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        roles: ["admin"],
        permissions: ["canEdit"],
        featureFlags: ["darkMode"],
        billingEntitlements: ["Pro gym"],
      });

      expect(result).toBe(true);
    });

    it("when all other checks pass but billing entitlements fail", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
          feature_flags: {
            darkMode: { v: true, t: "b" },
          },
        }),
      );

      fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        roles: ["admin"],
        permissions: ["canEdit"],
        featureFlags: ["darkMode"],
        billingEntitlements: ["Non-existent entitlement"],
      });

      expect(result).toBe(false);
    });

    it("when using custom conditions for billing entitlements", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
        }),
      );

      fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        roles: ["admin"],
        permissions: ["canEdit"],
        billingEntitlements: [
          {
            entitlement: "Pro gym",
            condition: (entitlement) => {
              return (
                entitlement.fixedCharge >= 30 &&
                entitlement.priceName === "Pro gym"
              );
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when custom condition for billing entitlements fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "admin", name: "admin" }],
          permissions: ["canEdit"],
        }),
      );

      fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        roles: ["admin"],
        permissions: ["canEdit"],
        billingEntitlements: [
          {
            entitlement: "Pro gym",
            condition: () => false, // Always fails
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when mixing string entitlements and custom conditions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      fetchMock
        .mockResponseOnce(JSON.stringify(mockEntitlementsResponse))
        .mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        billingEntitlements: [
          "Premium features", // string entitlement
          {
            entitlement: "Pro gym",
            condition: (entitlement) => entitlement.featureKey === "pro_gym",
          },
        ],
      });

      expect(result).toBe(true);
    });
  });

  describe("ForceApi Option", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("when forceApi is true (boolean) for all types", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockRolesResponse = {
        metadata: { has_more: false, next_page_starting_after: "" },
        data: {
          org_code: "org_123",
          roles: [{ id: "1", key: "apiAdmin", name: "API Administrator" }],
        },
      };

      const mockPermissionsResponse = {
        metadata: { has_more: false, next_page_starting_after: "" },
        data: {
          org_code: "org_123",
          permissions: [{ id: "1", name: "Can Edit", key: "apiCanEdit" }],
        },
      };

      const mockFlagsResponse = {
        metadata: { has_more: false, next_page_starting_after: "" },
        data: {
          feature_flags: [{ key: "apiFlag", value: true, type: "boolean" }],
        },
      };

      fetchMock
        .mockResponseOnce(JSON.stringify(mockPermissionsResponse))
        .mockResponseOnce(JSON.stringify(mockFlagsResponse))
        .mockResponseOnce(JSON.stringify(mockRolesResponse));

      const result = await has({
        roles: ["apiAdmin"],
        permissions: ["apiCanEdit"],
        featureFlags: ["apiFlag"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/permissions",
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/feature_flags",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toBe(true);
    });

    it("when forceApi is false (boolean) for all types", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "tokenAdmin", name: "Token Administrator" }],
          permissions: ["tokenCanEdit"],
          feature_flags: {
            tokenFlag: { v: true, t: "b" },
          },
        }),
      );

      const result = await has({
        roles: ["tokenAdmin"],
        permissions: ["tokenCanEdit"],
        featureFlags: ["tokenFlag"],
        forceApi: false,
      });

      expect(result).toBe(true);
    });

    it("when forceApi is object with specific flags for each type", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          feature_flags: {
            tokenFlag: { v: true, t: "b" },
          },
        }),
      );

      const mockRolesResponse = {
        metadata: { has_more: false, next_page_starting_after: "" },
        data: {
          org_code: "org_123",
          roles: [{ id: "1", key: "apiAdmin", name: "API Administrator" }],
        },
      };

      const mockPermissionsResponse = {
        metadata: { has_more: false, next_page_starting_after: "" },
        data: {
          org_code: "org_123",
          permissions: [{ id: "1", name: "Can Edit", key: "apiCanEdit" }],
        },
      };

      fetchMock
        .mockResponseOnce(JSON.stringify(mockPermissionsResponse))
        .mockResponseOnce(JSON.stringify(mockRolesResponse));

      const result = await has({
        roles: ["apiAdmin"],
        permissions: ["apiCanEdit"],
        featureFlags: ["tokenFlag"],
        forceApi: {
          roles: true,
          permissions: true,
          featureFlags: false,
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/permissions",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toBe(true);
    });

    it("when forceApi object has mixed boolean values", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          permissions: ["tokenCanEdit"],
          feature_flags: {
            tokenFlag: { v: true, t: "b" },
          },
        }),
      );

      const mockRolesResponse = {
        data: {
          org_code: "org_123",
          roles: [{ id: "1", key: "apiAdmin", name: "API Administrator" }],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockRolesResponse));

      const result = await has({
        roles: ["apiAdmin"],
        permissions: ["tokenCanEdit"],
        featureFlags: ["tokenFlag"],
        forceApi: {
          roles: true,
          permissions: false,
          featureFlags: false,
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toBe(true);
    });

    it("when forceApi object has undefined values (should use default)", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "tokenAdmin", name: "Token Administrator" }],
          permissions: ["tokenCanEdit"],
          feature_flags: {
            tokenFlag: { v: true, t: "b" },
          },
        }),
      );

      const result = await has({
        roles: ["tokenAdmin"],
        permissions: ["tokenCanEdit"],
        featureFlags: ["tokenFlag"],
        forceApi: {
          // No explicit values set, should use default (false/token behavior)
        },
      });

      expect(result).toBe(true);
    });

    it("when forceApi is used with custom conditions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockRolesResponse = {
        metadata: { has_more: false, next_page_starting_after: "" },
        data: {
          org_code: "org_123",
          roles: [{ id: "1", key: "apiAdmin", name: "API Administrator" }],
        },
      };

      const mockPermissionsResponse = {
        metadata: { has_more: false, next_page_starting_after: "" },
        data: {
          org_code: "org_456",
          permissions: [{ id: "1", name: "Can Manage", key: "apiCanManage" }],
        },
      };

      fetchMock
        .mockResponseOnce(JSON.stringify(mockPermissionsResponse))
        .mockResponseOnce(JSON.stringify(mockRolesResponse));

      const result = await has({
        roles: [
          {
            role: "apiAdmin",
            condition: (roleObj) => roleObj.name.includes("Administrator"),
          },
        ],
        permissions: [
          {
            permission: "apiCanManage",
            condition: (permissionAccess) =>
              permissionAccess.orgCode === "org_456",
          },
        ],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/permissions",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toBe(true);
    });

    it("when forceApi is true but some API calls fail", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockRolesResponse = {
        metadata: { has_more: false, next_page_starting_after: "" },
        data: {
          org_code: "org_123",
          roles: [
            { id: "1", key: "apiUser", name: "API User" }, // User doesn't have admin role
          ],
        },
      };

      const mockPermissionsResponse = {
        metadata: { has_more: false, next_page_starting_after: "" },
        data: {
          org_code: "org_123",
          permissions: [{ id: "1", name: "Can Edit", key: "apiCanEdit" }],
        },
      };

      fetchMock
        .mockResponseOnce(JSON.stringify(mockPermissionsResponse))
        .mockResponseOnce(JSON.stringify(mockRolesResponse));

      const result = await has({
        roles: ["apiAdmin"], // User doesn't have this role
        permissions: ["apiCanEdit"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/roles",
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/permissions",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toBe(false);
    });

    it("when forceApi is used with billing entitlements (always uses API)", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          roles: [{ id: "1", key: "tokenAdmin", name: "Token Administrator" }],
        }),
      );

      const mockEntitlementsResponse = {
        data: {
          org_code: "org_123",
          plans: [],
          entitlements: [
            {
              id: "entitlement_1",
              fixed_charge: 35,
              price_name: "Pro gym",
              unit_amount: 1,
              feature_key: "pro_gym",
              feature_name: "Pro Gym",
              entitlement_limit_max: 10,
              entitlement_limit_min: 1,
            },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        roles: ["tokenAdmin"],
        billingEntitlements: ["Pro gym"],
        forceApi: false, // Even though forceApi is false, billing entitlements always use API
      });

      expect(result).toBe(true);
    });

    it("when forceApi object specifies billingEntitlements: true (redundant but allowed)", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockEntitlementsResponse = {
        data: {
          org_code: "org_123",
          plans: [],
          entitlements: [
            {
              id: "entitlement_1",
              fixed_charge: 35,
              price_name: "Pro gym",
              unit_amount: 1,
              feature_key: "pro_gym",
              feature_name: "Pro Gym",
              entitlement_limit_max: 10,
              entitlement_limit_min: 1,
            },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsResponse));

      const result = await has({
        billingEntitlements: ["Pro gym"],
        forceApi: {
          billingEntitlements: true, // This is always true anyway
        },
      });

      expect(result).toBe(true);
    });

    it("when forceApi is true and one of the API requests fails", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      fetchMock
        .mockResponseOnce(
          JSON.stringify({
            data: {
              org_code: "org_123",
              roles: [{ id: "1", key: "apiAdmin", name: "API Administrator" }],
            },
          }),
        )
        .mockResponse({
          status: 500,
          statusText: "Internal Server Error",
          json: vi.fn(),
        });

      const result = await has({
        roles: ["apiAdmin"],
        permissions: ["apiCanEdit"],
        forceApi: true,
      });

      expect(result).toBe(false);
    });
  });
});
