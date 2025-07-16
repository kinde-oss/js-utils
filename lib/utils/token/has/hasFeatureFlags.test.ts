import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { hasFeatureFlags } from "./hasFeatureFlags";

const storage = new MemoryStorage();

describe("hasFeatureFlags", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.accessToken);
    const result = await hasFeatureFlags({ featureFlags: ["darkMode"] });

    expect(result).toBe(false);
  });

  it("when no params are provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: { v: true, t: "b" },
        },
      }),
    );

    const result = await hasFeatureFlags();

    expect(result).toBe(true);
  });

  it("when no feature flags provided", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: { v: true, t: "b" },
        },
      }),
    );
    const result = await hasFeatureFlags({});

    expect(result).toBe(true);
  });

  it("when empty feature flags array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: { v: true, t: "b" },
        },
      }),
    );
    const result = await hasFeatureFlags({ featureFlags: [] });

    expect(result).toBe(true);
  });

  it("when user has all required feature flags", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: { v: true, t: "b" },
          newDashboard: { v: "enabled", t: "s" },
          maxUsers: { v: 100, t: "i" },
        },
      }),
    );
    const result = await hasFeatureFlags({
      featureFlags: ["darkMode", "newDashboard"],
    });

    expect(result).toBe(true);
  });

  it("when user has some but not all required feature flags", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: { v: true, t: "b" },
        },
      }),
    );
    const result = await hasFeatureFlags({
      featureFlags: ["darkMode", "newDashboard"],
    });

    expect(result).toBe(false);
  });

  it("when user has no required feature flags", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          otherFlag: { v: true, t: "b" },
        },
      }),
    );
    const result = await hasFeatureFlags({
      featureFlags: ["darkMode", "newDashboard"],
    });

    expect(result).toBe(false);
  });

  it("when user has single required feature flag", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: { v: true, t: "b" },
        },
      }),
    );
    const result = await hasFeatureFlags({ featureFlags: ["darkMode"] });

    expect(result).toBe(true);
  });

  it("when token has no feature flags", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ feature_flags: null }),
    );
    const result = await hasFeatureFlags({ featureFlags: ["darkMode"] });

    expect(result).toBe(false);
  });

  it("when feature flag exists but has false boolean value", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: { v: false, t: "b" },
        },
      }),
    );
    const result = await hasFeatureFlags({ featureFlags: ["darkMode"] });

    expect(result).toBe(true);
  });

  it("when mixing different feature flag types", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: { v: true, t: "b" },
          theme: { v: "blue", t: "s" },
          maxItems: { v: 50, t: "i" },
        },
      }),
    );
    const result = await hasFeatureFlags({
      featureFlags: ["darkMode", "theme", "maxItems"],
    });

    expect(result).toBe(true);
  });

  describe("FeatureFlagKVCondition", () => {
    it("when flag exists and value matches exactly", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          feature_flags: {
            theme: { v: "dark", t: "s" },
            maxUsers: { v: 100, t: "i" },
            isEnabled: { v: true, t: "b" },
          },
        }),
      );

      const result = await hasFeatureFlags({
        featureFlags: [
          { flag: "theme", value: "dark" },
          { flag: "maxUsers", value: 100 },
          { flag: "isEnabled", value: true },
        ],
      });

      expect(result).toBe(true);
    });

    it("when flag exists but value doesn't match", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          feature_flags: {
            theme: { v: "dark", t: "s" },
            maxUsers: { v: 100, t: "i" },
          },
        }),
      );

      const result = await hasFeatureFlags({
        featureFlags: [
          { flag: "theme", value: "light" }, // mismatch
          { flag: "maxUsers", value: 100 },
        ],
      });

      expect(result).toBe(false);
    });

    it("when flag doesn't exist", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          feature_flags: {
            theme: { v: "dark", t: "s" },
          },
        }),
      );

      const result = await hasFeatureFlags({
        featureFlags: [{ flag: "nonExistentFlag", value: "any" }],
      });

      expect(result).toBe(false);
    });

    it("when mixing string flags and KV conditions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          feature_flags: {
            darkMode: { v: true, t: "b" },
            theme: { v: "blue", t: "s" },
          },
        }),
      );

      const result = await hasFeatureFlags({
        featureFlags: [
          "darkMode", // string flag - just check existence
          { flag: "theme", value: "blue" }, // KV condition - check existence and value
        ],
      });

      expect(result).toBe(true);
    });
  });

  describe("Mixed flag types", () => {
    it("when combining both flag types", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          feature_flags: {
            basicFlag: { v: "false", t: "b" },
            theme: { v: "dark", t: "s" },
            customFlag: { v: "enabled", t: "s" },
          },
        }),
      );

      const result = await hasFeatureFlags({
        featureFlags: [
          "basicFlag", // string flag
          { flag: "theme", value: "dark" }, // KV condition
        ],
      });

      expect(result).toBe(true);
    });

    it("when one condition fails in mixed types", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          feature_flags: {
            basicFlag: { v: true, t: "b" },
            theme: { v: "dark", t: "s" },
            customFlag: { v: "enabled", t: "s" },
          },
        }),
      );

      const result = await hasFeatureFlags({
        featureFlags: [
          "basicFlag", // string flag - passes
          { flag: "theme", value: "light" }, // KV condition - fails (value mismatch)
        ],
      });

      expect(result).toBe(false);
    });
  });
});
