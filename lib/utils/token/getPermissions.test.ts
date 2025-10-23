import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage, getPermissions, getPermissionsSync } from ".";
import { createMockAccessToken } from "./testUtils";
import createFetchMock from "vitest-fetch-mock";

enum PermissionEnum {
  canEdit = "canEdit",
}

const fetchMock = createFetchMock(vi);
const storage = new MemoryStorage();

describe("getPermissions", () => {
  beforeEach(() => {
    setActiveStorage(storage);
    fetchMock.enableMocks();
  });

  afterEach(() => {
    fetchMock.resetMocks();
  });

  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.idToken);
    const idToken = await getPermissions();

    expect(idToken).toStrictEqual({
      orgCode: null,
      permissions: [],
    });
  });

  it("with value", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const idToken = await getPermissions();

    expect(idToken).toStrictEqual({
      orgCode: "org_123456789",
      permissions: ["canEdit"],
    });
  });

  it("with value and typed permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const idToken = await getPermissions<PermissionEnum>();

    expect(idToken).toStrictEqual({
      orgCode: "org_123456789",
      permissions: [PermissionEnum.canEdit],
    });
  });

  it("no permissions array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: null }),
    );
    const idToken = await getPermissions<PermissionEnum>();

    expect(idToken).toStrictEqual({
      orgCode: "org_123456789",
      permissions: [],
    });
  });

  it("when hardCheck is true, calls account API", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: null }),
    );
    fetchMock.mockResponseOnce(
      JSON.stringify({
        data: {
          org_code: "org_0195ac80a14e",
          permissions: [
            {
              id: "perm_0195ac80a14e8d71f42b98e75d3c61ad",
              name: "View reports",
              key: "view_reports",
            },
          ],
        },
        metadata: {
          has_more: false,
          next_page_starting_after: "perm_0195ac80a14e8d71f42b98e75d3c61ad",
        },
      }),
    );

    const permissions = await getPermissions({ forceApi: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://kinde.com/account_api/v1/permissions",
      expect.anything(),
    );
    expect(permissions).toStrictEqual({
      orgCode: "org_0195ac80a14e",
      permissions: ["view_reports"],
    });
  });

  it("when hardCheck is true, calls account API - multiple pages", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: null }),
    );
    fetchMock
      .mockResponseOnce(
        JSON.stringify({
          data: {
            org_code: "org_0195ac80a14e",
            permissions: [
              {
                id: "perm_0195ac80a14e8d71f42b98e75d3c61ad",
                name: "View reports",
                key: "view_reports",
              },
            ],
          },
          metadata: {
            has_more: true,
            next_page_starting_after: "perm_0195ac80a14e8d71f42b98e75d3c61ad",
          },
        }),
      )
      .mockResponseOnce(
        JSON.stringify({
          data: {
            org_code: "org_0195ac80a14e",
            permissions: [
              {
                id: "perm_0195ac80a14e8d71f42b98e75d3c6112",
                name: "View bills",
                key: "view_bills",
              },
            ],
          },
          metadata: {
            has_more: false,
            next_page_starting_after: "perm_0195ac80a14e8d71f42b98e75d3c6112",
          },
        }),
      );
    const permissions = await getPermissions({ forceApi: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://kinde.com/account_api/v1/permissions",
      expect.anything(),
    );
    expect(permissions).toStrictEqual({
      orgCode: "org_0195ac80a14e",
      permissions: ["view_reports", "view_bills"],
    });
  });
});

describe("getPermissionsSync", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token returns empty", () => {
    storage.removeSessionItem(StorageKeys.accessToken);
    expect(getPermissionsSync()).toStrictEqual({
      orgCode: null,
      permissions: [],
    });
  });

  it("reads from token", () => {
    storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ org_code: "org_1", permissions: ["p1", "p2"] }),
    );
    const res = getPermissionsSync();
    expect(res).toStrictEqual({ orgCode: "org_1", permissions: ["p1", "p2"] });
  });

  it("throws on forceApi", () => {
    expect(() => getPermissionsSync({ forceApi: true })).toThrow(
      "forceApi cannot be used in sync mode",
    );
  });
});
