import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage, getFlags, getFlagsSync } from ".";
import { createMockAccessToken } from "./testUtils";
import * as callAccountApi from "./accountApi/callAccountApi";

const storage = new MemoryStorage();

// Mock the API call
vi.mock("./accountApi/callAccountApi", () => ({
  callAccountApiPaginated: vi.fn(),
}));

describe("getFlags", () => {
  beforeEach(() => {
    setActiveStorage(storage);
    vi.clearAllMocks();
  });

  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.accessToken);
    const flags = await getFlags();
    expect(flags).toStrictEqual(null);
  });

  it("when no flags in token", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: null,
      }),
    );
    const flags = await getFlags();
    expect(flags).toStrictEqual(null);
  });

  it("when empty flags object", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {},
      }),
    );
    const flags = await getFlags();
    expect(flags).toStrictEqual([]);
  });

  it("single boolean flag", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: {
            v: true,
            t: "boolean",
          },
        },
      }),
    );
    const flags = await getFlags();

    expect(flags).toStrictEqual([
      {
        key: "darkMode",
        value: true,
        type: "boolean",
      },
    ]);
  });

  it("single string flag", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          theme: {
            v: "dark",
            t: "string",
          },
        },
      }),
    );
    const flags = await getFlags();

    expect(flags).toStrictEqual([
      {
        key: "theme",
        value: "dark",
        type: "string",
      },
    ]);
  });

  it("single integer flag", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          maxUsers: {
            v: 100,
            t: "integer",
          },
        },
      }),
    );
    const flags = await getFlags();

    expect(flags).toStrictEqual([
      {
        key: "maxUsers",
        value: 100,
        type: "integer",
      },
    ]);
  });

  it("single object flag", async () => {
    const configValue = { timeout: 5000, retries: 3 };
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          apiConfig: {
            v: configValue,
            t: "object",
          },
        },
      }),
    );
    const flags = await getFlags();

    expect(flags).toStrictEqual([
      {
        key: "apiConfig",
        value: configValue,
        type: "object",
      },
    ]);
  });

  it("multiple flags with mixed types", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: {
            v: true,
            t: "boolean",
          },
          theme: {
            v: "dark",
            t: "string",
          },
          maxUsers: {
            v: 100,
            t: "integer",
          },
          disabled: {
            v: false,
            t: "boolean",
          },
        },
      }),
    );
    const flags = await getFlags();

    expect(flags).toHaveLength(4);
    expect(flags).toEqual(
      expect.arrayContaining([
        {
          key: "darkMode",
          value: true,
          type: "boolean",
        },
        {
          key: "theme",
          value: "dark",
          type: "string",
        },
        {
          key: "maxUsers",
          value: 100,
          type: "integer",
        },
        {
          key: "disabled",
          value: false,
          type: "boolean",
        },
      ]),
    );
  });

  it("uses hasura-style feature flags when regular flags not present", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        "x-hasura-feature-flags": {
          hasuraFlag: {
            v: "hasura-value",
            t: "string",
          },
        },
      }),
    );
    const flags = await getFlags();

    expect(flags).toStrictEqual([
      {
        key: "hasuraFlag",
        value: "hasura-value",
        type: "string",
      },
    ]);
  });

  it("prefers feature_flags over x-hasura-feature-flags when both present", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          normalFlag: {
            v: "normal-value",
            t: "string",
          },
        },
        "x-hasura-feature-flags": {
          hasuraFlag: {
            v: "hasura-value",
            t: "string",
          },
        },
      }),
    );
    const flags = await getFlags();

    expect(flags).toStrictEqual([
      {
        key: "normalFlag",
        value: "normal-value",
        type: "string",
      },
    ]);
  });

  describe("with forceApi option", () => {
    it("calls API and returns formatted flags", async () => {
      const mockApiResponse = {
        feature_flags: [
          {
            id: "1",
            name: "api-flag-1",
            key: "apiFlag1",
            type: "boolean",
            value: true,
          },
          {
            id: "2",
            name: "api-flag-2",
            key: "apiFlag2",
            type: "string",
            value: "api-value",
          },
        ],
      };

      vi.mocked(callAccountApi.callAccountApiPaginated).mockResolvedValue(
        mockApiResponse,
      );

      const flags = await getFlags({ forceApi: true });

      expect(callAccountApi.callAccountApiPaginated).toHaveBeenCalledWith({
        url: "account_api/v1/feature_flags",
      });

      expect(flags).toStrictEqual([
        {
          key: "apiFlag1",
          value: true,
          type: "boolean",
        },
        {
          key: "apiFlag2",
          value: "api-value",
          type: "string",
        },
      ]);
    });

    it("returns empty array when API returns no flags", async () => {
      const mockApiResponse = {
        feature_flags: [],
      };

      vi.mocked(callAccountApi.callAccountApiPaginated).mockResolvedValue(
        mockApiResponse,
      );

      const flags = await getFlags({ forceApi: true });

      expect(flags).toStrictEqual([]);
    });

    it("handles API error gracefully", async () => {
      vi.mocked(callAccountApi.callAccountApiPaginated).mockRejectedValue(
        new Error("API Error"),
      );

      await expect(getFlags({ forceApi: true })).rejects.toThrow("API Error");
    });

    it("when API returns null feature_flags", async () => {
      const mockApiResponse = {
        feature_flags: null,
      };

      vi.mocked(callAccountApi.callAccountApiPaginated).mockResolvedValue(
        mockApiResponse,
      );

      const flags = await getFlags({ forceApi: true });
      expect(flags).toStrictEqual([]);
    });

    it("when API returns undefined feature_flags", async () => {
      const mockApiResponse = {
        feature_flags: undefined,
      };

      vi.mocked(callAccountApi.callAccountApiPaginated).mockResolvedValue(
        mockApiResponse,
      );

      const flags = await getFlags({ forceApi: true });
      expect(flags).toStrictEqual([]);
    });
  });
});

describe("getFlagsSync", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", () => {
    storage.removeSessionItem(StorageKeys.accessToken);
    const flags = getFlagsSync();
    expect(flags).toStrictEqual(null);
  });

  it("single boolean flag", () => {
    storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          darkMode: { v: true, t: "boolean" },
        },
      }),
    );
    const flags = getFlagsSync();
    expect(flags).toStrictEqual([
      { key: "darkMode", value: true, type: "boolean" },
    ]);
  });

  it("throws on forceApi", () => {
    expect(() => getFlagsSync({ forceApi: true })).toThrow(
      "forceApi cannot be used in sync mode",
    );
  });
});
