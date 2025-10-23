import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";
import { getPermissions } from ".";

const storage = new MemoryStorage();

enum PermissionEnum {
  canEdit = "canEdit",
}

describe("getPermissions - Hasura", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    storage.removeSessionItem(StorageKeys.accessToken);
    const idToken = await getPermissions();

    expect(idToken).toStrictEqual({
      orgCode: null,
      permissions: [],
    });
  });

  it("with value", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        org_code: null,
        "x-hasura-org-code": "org_123456",
        "x-hasura-permissions": ["canEdit"],
      }),
    );
    const idToken = await getPermissions();

    expect(idToken).toStrictEqual({
      orgCode: "org_123456",
      permissions: ["canEdit"],
    });
  });

  it("with value and typed permissions", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        org_code: null,
        "x-hasura-org-code": "org_123456",
        "x-hasura-permissions": ["canEdit"],
      }),
    );
    const idToken = await getPermissions<PermissionEnum>();

    expect(idToken).toStrictEqual({
      orgCode: "org_123456",
      permissions: [PermissionEnum.canEdit],
    });
  });

  it("no permissions array", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        org_code: null,
        "x-hasura-org-code": "org_123456",
        "x-hasura-permissions": null,
      }),
    );
    const idToken = await getPermissions<PermissionEnum>();

    expect(idToken).toStrictEqual({
      orgCode: "org_123456",
      permissions: [],
    });
  });
});
