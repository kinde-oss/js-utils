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
    await storage.removeSessionItem(StorageKeys.accessToken);
    const idToken = await getCurrentOrganization();
    expect(idToken).toStrictEqual(null);
  });

  it("with access", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ org_code: "org_123456" }),
    );
    const orgCode = await getCurrentOrganization();

    expect(orgCode).toStrictEqual("org_123456");
  });
});

describe("getCurrentOrganizationSync", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });
  it("when no token", () => {
    storage.removeSessionItem(StorageKeys.idToken);
    storage.removeSessionItem(StorageKeys.accessToken);
    const orgCode = getCurrentOrganizationSync();

    expect(orgCode).toStrictEqual(null);
  });

  it("with access", () => {
    storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ org_code: "org_123456" }),
    );
    const orgCode = getCurrentOrganizationSync();
    expect(orgCode).toStrictEqual("org_123456");
  });
});
