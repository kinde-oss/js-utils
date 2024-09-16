import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage, getPermission } from ".";
import { createMockAccessToken } from "./testUtils";

const storage = new MemoryStorage();

enum PermissionEnum {
  canEdit = "canEdit",
}

describe("getPermission", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });
  it("when no token", async () => {
    await storage.setSessionItem(StorageKeys.idToken, null);
    const idToken = await getPermission("test");

    expect(idToken).toStrictEqual({
      isGranted: false,
      orgCode: null,
      permissionKey: "test",
    });
  });

  it("when no token with enum", async () => {
    await storage.setSessionItem(StorageKeys.idToken, null);
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
