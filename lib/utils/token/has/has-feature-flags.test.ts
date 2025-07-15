import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { hasFeatureFlags } from "./has-feature-flags";

const storage = new MemoryStorage();

describe("hasFeatureFlags", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.setSessionItem(StorageKeys.idToken, null);
    const result = await hasFeatureFlags({ featureFlags: ["darkMode"] });

    expect(result).toBe(false);
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
    const result = await hasFeatureFlags({ featureFlags: ["darkMode", "newDashboard"] });

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
    const result = await hasFeatureFlags({ featureFlags: ["darkMode", "newDashboard"] });

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
    const result = await hasFeatureFlags({ featureFlags: ["darkMode", "newDashboard"] });

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
    const result = await hasFeatureFlags({ featureFlags: ["darkMode", "theme", "maxItems"] });

    expect(result).toBe(true);
  });
}); 