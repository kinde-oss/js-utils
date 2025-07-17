import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage, getFlag } from ".";
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
    await storage.setSessionItem(StorageKeys.idToken, null);
    const idToken = await getFlag("test");
    expect(idToken).toStrictEqual(null);
  });

  it("when no flags", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        feature_flags: null,
      }),
    );
    const idToken = await getFlag("test");

    expect(idToken).toStrictEqual(null);
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
    const idToken = await getFlag();

    expect(idToken).toStrictEqual(null);
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
    const idToken = await getFlag<boolean>("test");

    expect(idToken).toStrictEqual(true);
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
    const idToken = await getFlag<boolean>("test");

    expect(idToken).toStrictEqual(false);
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
    const idToken = await getFlag<string>("test");

    expect(idToken).toStrictEqual("hello");
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
    const idToken = await getFlag<number>("test");

    expect(idToken).toStrictEqual(5);
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
    const idToken = await getFlag<number>("noexist");

    expect(idToken).toStrictEqual(null);
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

    it("returns empty array when API returns no flags", async () => {
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
