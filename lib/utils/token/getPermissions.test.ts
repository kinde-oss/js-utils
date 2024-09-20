import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";
import { getPermissions } from ".";

const storage = new MemoryStorage();

enum PermissionEnum {
  canEdit = "canEdit",
}

describe("getPermissions", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.setSessionItem(StorageKeys.idToken, null);
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
});
