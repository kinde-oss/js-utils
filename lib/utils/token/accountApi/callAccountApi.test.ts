import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callAccountApi } from "./callAccountApi";
import * as indexModule from "../index";
import { MemoryStorage, StorageKeys } from "../../../sessionManager";
import { createMockAccessToken } from "../testUtils";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);
const store = new MemoryStorage();

describe("callAccountApi", () => {
  beforeEach(() => {
    store.destroySession();
    indexModule.setActiveStorage(store);
    fetchMock.enableMocks();
  });

  afterEach(() => {
    fetchMock.resetMocks();

    vi.restoreAllMocks();
  });

  it("throws error if no active storage", async () => {
    indexModule.clearActiveStorage();
    await expect(callAccountApi("account_api/test")).rejects.toThrow(
      "No active storage found.",
    );
  });

  it("throws error if no token in storage", async () => {
    await expect(callAccountApi("account_api/test")).rejects.toThrow(
      "Authentication token not found.",
    );
  });

  it("throws error if no domain (iss claim)", async () => {
    await store.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ iss: undefined }),
    );

    await expect(callAccountApi("account_api/test")).rejects.toThrow(
      "Domain (iss claim) not found.",
    );
  });

  it("throws error if fetch response is not ok", async () => {
    fetchMock.mockResponse({
      status: 403,
      statusText: "Forbidden",
      json: vi.fn(),
    });
    await store.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken(),
    );

    await expect(callAccountApi("account_api/test")).rejects.toThrow(
      "API request failed with status 403",
    );
  });

  it("returns data if all is well", async () => {
    const token = createMockAccessToken();
    await store.setSessionItem(StorageKeys.accessToken, token);

    const fakeData = { foo: "bar" };
    fetchMock.mockResponseOnce(JSON.stringify(fakeData));

    const result = await callAccountApi<typeof fakeData>("account_api/test");
    expect(result).toEqual(fakeData);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://kinde.com/account_api/test",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});
