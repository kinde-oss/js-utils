import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { hasBillingEntitlements } from "./hasBillingEntitlements";
import { type Entitlement } from "../../../types";
import * as getEntitlements from "../getEntitlements";

const storage = new MemoryStorage();

// Mock the getEntitlements function
vi.mock("../getEntitlements", () => ({
  getEntitlements: vi.fn(),
}));

const mockEntitlementsResponse = {
  orgCode: "org_123",
  plans: [
    {
      key: "pro_plan",
      subscribedOn: "2025-06-01T12:00:00Z",
    },
  ],
  entitlements: [
    {
      id: "entitlement_1",
      fixedCharge: 35,
      priceName: "Pro gym",
      unitAmount: 1,
      featureKey: "pro_gym",
      featureName: "Pro Gym",
      entitlementLimitMax: 10,
      entitlementLimitMin: 1,
    },
    {
      id: "entitlement_2",
      fixedCharge: 50,
      priceName: "Premium features",
      unitAmount: 1,
      featureKey: "premium_features",
      featureName: "Premium Features",
      entitlementLimitMax: 100,
      entitlementLimitMin: 1,
    },
    {
      id: "entitlement_3",
      fixedCharge: 25,
      priceName: "Basic plan",
      unitAmount: 1,
      featureKey: "basic_plan",
      featureName: "Basic Plan",
      entitlementLimitMax: 5,
      entitlementLimitMin: 1,
    },
  ],
};

describe("hasBillingEntitlements", () => {
  beforeEach(() => {
    setActiveStorage(storage);
    vi.clearAllMocks();
    // Default mock implementation
    vi.mocked(getEntitlements.getEntitlements).mockResolvedValue(
      mockEntitlementsResponse,
    );
  });

  it("when no params are provided", async () => {
    const result = await hasBillingEntitlements(undefined as any);
    expect(result).toBe(true);
  });

  it("when no billingEntitlements provided", async () => {
    const result = await hasBillingEntitlements({} as any);
    expect(result).toBe(true);
  });

  it("when empty billingEntitlements array", async () => {
    const result = await hasBillingEntitlements({ billingEntitlements: [] });
    expect(result).toBe(true);
  });

  it("when user has single required entitlement", async () => {
    const result = await hasBillingEntitlements({
      billingEntitlements: ["Pro gym"],
    });
    expect(result).toBe(true);
  });

  it("when user has all required entitlements", async () => {
    const result = await hasBillingEntitlements({
      billingEntitlements: ["Pro gym", "Premium features"],
    });
    expect(result).toBe(true);
  });

  it("when user has some but not all required entitlements", async () => {
    const result = await hasBillingEntitlements({
      billingEntitlements: ["Pro gym", "Non-existent entitlement"],
    });
    expect(result).toBe(false);
  });

  it("when user has no required entitlements", async () => {
    const result = await hasBillingEntitlements({
      billingEntitlements: [
        "Non-existent entitlement",
        "Another missing entitlement",
      ],
    });
    expect(result).toBe(false);
  });

  it("when getEntitlements returns empty entitlements array", async () => {
    vi.mocked(getEntitlements.getEntitlements).mockResolvedValue({
      ...mockEntitlementsResponse,
      entitlements: [],
    });

    const result = await hasBillingEntitlements({
      billingEntitlements: ["Pro gym"],
    });
    expect(result).toBe(false);
  });

  describe("CustomCondition", () => {
    it("when sync custom condition returns true", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Pro gym",
            condition: (entitlement: Entitlement) => {
              return (
                entitlement.priceName === "Pro gym" &&
                entitlement.fixedCharge === 35
              );
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when sync custom condition returns false", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Pro gym",
            condition: () => false, // Always false
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when async custom condition returns true", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Premium features",
            condition: async (entitlement: Entitlement) => {
              // Simulate async operation
              await new Promise((resolve) => setTimeout(resolve, 1));
              return (
                entitlement.priceName === "Premium features" &&
                entitlement.unitAmount >= 1
              );
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when async custom condition returns false", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Basic plan",
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

    it("when custom condition can access the full entitlement object", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Pro gym",
            condition: (entitlement: Entitlement) => {
              // Custom logic based on entitlement object properties
              return (
                entitlement.featureKey === "pro_gym" &&
                entitlement.entitlementLimitMax >= 10 &&
                entitlement.fixedCharge > 30
              );
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when entitlement doesn't exist for custom condition", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Non-existent entitlement",
            condition: () => true, // Would return true if entitlement existed
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when combining string entitlements and custom conditions", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          "Basic plan", // string entitlement - check existence
          {
            entitlement: "Pro gym",
            condition: (entitlement: Entitlement) =>
              entitlement.priceName === "Pro gym" &&
              entitlement.fixedCharge === 35, // custom condition
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when one condition fails in mixed types", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          "Pro gym", // string entitlement - passes
          {
            entitlement: "Premium features",
            condition: () => false, // custom condition - fails
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when multiple custom conditions with different results", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Pro gym",
            condition: () => true, // passes
          },
          {
            entitlement: "Premium features",
            condition: () => false, // fails
          },
        ],
      });

      expect(result).toBe(false);
    });

    it("when all custom conditions pass", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Pro gym",
            condition: (entitlement: Entitlement) =>
              entitlement.featureKey.includes("pro") &&
              entitlement.fixedCharge > 30, // passes
          },
          {
            entitlement: "Premium features",
            condition: async (entitlement: Entitlement) => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              return (
                entitlement.featureName.includes("Premium") &&
                entitlement.unitAmount === 1
              ); // passes
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when custom condition evaluates entitlement limits", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Premium features",
            condition: (entitlement: Entitlement) => {
              // Custom logic based on entitlement limits
              return (
                entitlement.entitlementLimitMax >= 50 &&
                entitlement.entitlementLimitMin === 1 &&
                entitlement.fixedCharge === 50
              );
            },
          },
        ],
      });

      expect(result).toBe(true);
    });

    it("when custom condition fails on limits check", async () => {
      const result = await hasBillingEntitlements({
        billingEntitlements: [
          {
            entitlement: "Basic plan",
            condition: (entitlement: Entitlement) => {
              // Condition that should fail for Basic plan
              return entitlement.entitlementLimitMax > 100; // Basic plan has max 5
            },
          },
        ],
      });

      expect(result).toBe(false);
    });
  });

  describe("API error handling", () => {
    it("handles API error gracefully", async () => {
      vi.mocked(getEntitlements.getEntitlements).mockRejectedValue(
        new Error("API Error"),
      );

      await expect(
        hasBillingEntitlements({ billingEntitlements: ["Pro gym"] }),
      ).rejects.toThrow("API Error");
    });

    it("handles network timeout", async () => {
      vi.mocked(getEntitlements.getEntitlements).mockRejectedValue(
        new Error("Network timeout"),
      );

      await expect(
        hasBillingEntitlements({ billingEntitlements: ["Premium features"] }),
      ).rejects.toThrow("Network timeout");
    });
  });
});
