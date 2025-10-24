import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage, getPermission, getPermissionSync } from ".";
import { createMockAccessToken } from "./testUtils";
import * as callAccountApi from "./accountApi/callAccountApi";

const storage = new MemoryStorage();

describe("getPermissionSync", () => {
  beforeEach(() => {
    storage.destroySession();
    setActiveStorage(storage);
  });

  it("returns false when no token", () => {
    storage.removeSessionItem(StorageKeys.accessToken);
    const res = getPermissionSync("perm1");
    expect(res).toStrictEqual({
      permissionKey: "perm1",
      orgCode: null,
      isGranted: false,
    });
  });

  it("reads from token", () => {
    storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ org_code: "org_1", permissions: ["perm1"] }),
    );
    const res = getPermissionSync("perm1");
    expect(res).toStrictEqual({
      permissionKey: "perm1",
      orgCode: "org_1",
      isGranted: true,
    });
  });

  it("throws on forceApi", () => {
    expect(() => getPermissionSync("perm1", { forceApi: true })).toThrow(
      "forceApi cannot be used in sync mode",
    );
  });
});

enum PermissionEnum {
  canEdit = "canEdit",
}

describe("getPermission", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });
  it("when no token", async () => {
    storage.removeSessionItem(StorageKeys.idToken);
    storage.removeSessionItem(StorageKeys.accessToken);

    const idToken = await getPermission("test");

    expect(idToken).toStrictEqual({
      isGranted: false,
      orgCode: null,
      permissionKey: "test",
    });
  });

  it("when no token with enum", async () => {
    storage.removeSessionItem(StorageKeys.idToken);
    storage.removeSessionItem(StorageKeys.accessToken);
    const idToken = await getPermission<PermissionEnum>(PermissionEnum.canEdit);

    expect(idToken).toStrictEqual({
      isGranted: false,
      orgCode: null,
      permissionKey: "canEdit",
    });
  });

  it("with access", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: ["canEdit"] }),
    );
    const idToken = await getPermission<PermissionEnum>(PermissionEnum.canEdit);

    expect(idToken).toStrictEqual({
      isGranted: true,
      orgCode: "org_123456789",
      permissionKey: "canEdit",
    });
  });

  it("with access different org", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        permissions: ["canEdit"],
        org_code: "org_123456799",
      }),
    );
    const idToken = await getPermission<PermissionEnum>(PermissionEnum.canEdit);

    expect(idToken).toStrictEqual({
      isGranted: true,
      orgCode: "org_123456799",
      permissionKey: "canEdit",
    });
  });

  it("no access, empty permission array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ permissions: null }),
    );
    const idToken = await getPermission<PermissionEnum>(PermissionEnum.canEdit);

    expect(idToken).toStrictEqual({
      isGranted: false,
      orgCode: "org_123456789",
      permissionKey: "canEdit",
    });
  });
});

vi.mock("./accountApi/callAccountApi", () => ({
  callAccountApi: vi.fn(),
}));

describe("getPermission - forceApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActiveStorage(storage);
  });

  it("encodes permission key when calling account API", async () => {
    vi.mocked(callAccountApi.callAccountApi).mockResolvedValue({
      permissionKey: "view reports/advanced",
      orgCode: "org_api",
      isGranted: true,
    });

    const key = "view reports/advanced";
    const res = await getPermission(key, { forceApi: true });

    expect(callAccountApi.callAccountApi).toHaveBeenCalledWith(
      "account_api/v1/permission/view%20reports%2Fadvanced",
    );
    expect(res).toStrictEqual({
      permissionKey: key,
      orgCode: "org_api",
      isGranted: true,
    });
  });
});
