import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import {
  setActiveStorage,
  getCurrentOrganization,
  getCurrentOrganizationSync,
} from ".";
import { createMockAccessToken } from "./testUtils";

const storage = new MemoryStorage();

describe("getCurrentOrganization", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });
  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.idToken);
    const idToken = await getCurrentOrganization();

    expect(idToken).toStrictEqual(null);
  });

  it("with access", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        org_code: null,
        ["x-hasura-org-code"]: "org_123456",
      }),
    );
    const orgCode = await getCurrentOrganization();

    expect(orgCode).toStrictEqual("org_123456");
  });
});

describe("getCurrentOrganizationSync - Hasura", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", () => {
    storage.removeSessionItem(StorageKeys.accessToken);
    const orgCode = getCurrentOrganizationSync();
    expect(orgCode).toStrictEqual(null);
  });

  it("with access", () => {
    storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        org_code: null,
        ["x-hasura-org-code"]: "org_123456",
      }),
    );
    const orgCode = getCurrentOrganizationSync();
    expect(orgCode).toStrictEqual("org_123456");
  });
});
