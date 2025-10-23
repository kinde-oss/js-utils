import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage, getFlag, getFlagSync } from ".";
import { createMockAccessToken } from "./testUtils";
import * as callAccountApi from "./accountApi/callAccountApi";

// Mock the API call
vi.mock("./accountApi/callAccountApi", () => ({
  callAccountApiPaginated: vi.fn(),
}));

const storage = new MemoryStorage();

describe("getFlag", () => {
  beforeEach(() => {
    setActiveStorage(storage);
    vi.clearAllMocks();
  });

  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.idToken);
    const flagValue = await getFlag("test");
    expect(flagValue).toStrictEqual(null);
  });

  it("when no flags", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: null,
      }),
    );
    const flagValue = await getFlag("test");

    expect(flagValue).toStrictEqual(null);
  });

  it("when name missing", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          test: {
            v: true,
            t: "b",
          },
        },
      }),
    );

    // @ts-expect-error - we want to test the case where no flag name is provided
    const flagValue = await getFlag();

    expect(flagValue).toStrictEqual(null);
  });

  it("boolean true", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          test: {
            v: true,
            t: "b",
          },
        },
      }),
    );
    const flagValue = await getFlag<boolean>("test");

    expect(flagValue).toStrictEqual(true);
  });

  it("boolean false", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          test: {
            v: false,
            t: "b",
          },
        },
      }),
    );
    const flagValue = await getFlag<boolean>("test");

    expect(flagValue).toStrictEqual(false);
  });

  it("string", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          test: {
            v: "hello",
            t: "s",
          },
        },
      }),
    );
    const flagValue = await getFlag<string>("test");

    expect(flagValue).toStrictEqual("hello");
  });

  it("integer", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          test: {
            v: 5,
            t: "i",
          },
        },
      }),
    );
    const flagValue = await getFlag<number>("test");

    expect(flagValue).toStrictEqual(5);
  });

  it("no existing flag", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          test: {
            v: 5,
            t: "i",
          },
        },
      }),
    );
    const flagValue = await getFlag<number>("noexist");

    expect(flagValue).toStrictEqual(null);
  });

  describe("with forceApi option", () => {
    it("calls API and returns flag value when found", async () => {
      const mockApiResponse = {
        feature_flags: [
          {
            id: "1",
            name: "test-flag",
            key: "testFlag",
            type: "boolean",
            value: true,
          },
          {
            id: "2",
            name: "another-flag",
            key: "anotherFlag",
            type: "string",
            value: "api-value",
          },
        ],
      };

      vi.mocked(callAccountApi.callAccountApiPaginated).mockResolvedValue(
        mockApiResponse,
      );

      const result = await getFlag("test-flag", { forceApi: true });

      expect(callAccountApi.callAccountApiPaginated).toHaveBeenCalledWith({
        url: "account_api/v1/feature_flags",
      });

      expect(result).toStrictEqual(true);
    });

    it("returns null when flag not found in API", async () => {
      const mockApiResponse = {
        feature_flags: [
          {
            id: "1",
            name: "other-flag",
            key: "otherFlag",
            type: "string",
            value: "other-value",
          },
        ],
      };

      vi.mocked(callAccountApi.callAccountApiPaginated).mockResolvedValue(
        mockApiResponse,
      );

      const result = await getFlag("nonexistent-flag", { forceApi: true });

      expect(result).toStrictEqual(null);
    });

    it("returns null when API returns no flags", async () => {
      const mockApiResponse = {
        feature_flags: [],
      };

      vi.mocked(callAccountApi.callAccountApiPaginated).mockResolvedValue(
        mockApiResponse,
      );

      const result = await getFlag("test-flag", { forceApi: true });

      expect(result).toStrictEqual(null);
    });

    it("handles API error gracefully", async () => {
      vi.mocked(callAccountApi.callAccountApiPaginated).mockRejectedValue(
        new Error("API Error"),
      );

      await expect(getFlag("test-flag", { forceApi: true })).rejects.toThrow(
        "API Error",
      );
    });
  });
});

describe("getFlagSync", () => {
  beforeEach(() => {
    setActiveStorage(storage);
    vi.clearAllMocks();
  });

  it("when no token", () => {
    storage.removeSessionItem(StorageKeys.idToken);
    storage.removeSessionItem(StorageKeys.accessToken);
    const flagValue = getFlagSync("test");
    expect(flagValue).toStrictEqual(null);
  });

  it("when no flags", () => {
    storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: null,
      }),
    );
    const flagValue = getFlagSync("test");
    expect(flagValue).toStrictEqual(null);
  });

  it("boolean true", () => {
    storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: {
          test: { v: true, t: "b" },
        },
      }),
    );
    const flagValue = getFlagSync<boolean>("test");
    expect(flagValue).toStrictEqual(true);
  });

  it("throws on forceApi", () => {
    expect(() => getFlagSync("x", { forceApi: true })).toThrow(
      "forceApi cannot be used in sync mode",
    );
  });
});
