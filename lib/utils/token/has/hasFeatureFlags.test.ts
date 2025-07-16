import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { setActiveStorage } from "..";
import { createMockAccessToken } from "../testUtils";
import { hasFeatureFlags } from "./hasFeatureFlags";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);
const storage = new MemoryStorage();

describe("hasFeatureFlags", () => {
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

    // @ts-expect-error - no params provided
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

    // @ts-expect-error - no params provided
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

  describe("forceApi option", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("when forceApi is true and feature flags are fetched from API", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          feature_flags: [
            { key: "apiFlag", value: true, type: "boolean" },
            { key: "apiTheme", value: "dark", type: "string" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasFeatureFlags({
        featureFlags: ["apiFlag"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/feature_flags",
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

    it("when forceApi is false and feature flags are read from token", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          feature_flags: {
            tokenFlag: { v: true, t: "b" },
          },
        }),
      );

      const result = await hasFeatureFlags({
        featureFlags: ["tokenFlag"],
        forceApi: false,
      });

      expect(result).toBe(true);
    });

    it("when forceApi is not provided and defaults to token behavior", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken({
          feature_flags: {
            defaultFlag: { v: true, t: "b" },
          },
        }),
      );

      const result = await hasFeatureFlags({
        featureFlags: ["defaultFlag"],
      });

      expect(result).toBe(true);
    });

    it("when forceApi is true with KV conditions", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          feature_flags: [
            { key: "apiTheme", value: "dark", type: "string" },
            { key: "apiMaxUsers", value: 100, type: "integer" },
          ],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasFeatureFlags({
        featureFlags: [
          { flag: "apiTheme", value: "dark" },
          { flag: "apiMaxUsers", value: 100 },
        ],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/feature_flags",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(true);
    });

    it("when forceApi is true but API returns no matching flags", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          feature_flags: [{ key: "otherFlag", value: true, type: "boolean" }],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasFeatureFlags({
        featureFlags: ["nonExistentFlag"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/feature_flags",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result).toBe(false);
    });

    it("when forceApi is true and API returns empty feature flags", async () => {
      await storage.setSessionItem(
        StorageKeys.accessToken,
        createMockAccessToken(),
      );

      const mockApiResponse = {
        data: {
          feature_flags: [],
        },
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const result = await hasFeatureFlags({
        featureFlags: ["anyFlag"],
        forceApi: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://kinde.com/account_api/v1/feature_flags",
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
        status: 500,
        statusText: "Internal Server Error",
        json: vi.fn(),
      });

      await expect(
        hasFeatureFlags({
          featureFlags: ["anyFlag"],
          forceApi: true,
        }),
      ).rejects.toThrow("API request failed with status 500");
    });
  });
});
