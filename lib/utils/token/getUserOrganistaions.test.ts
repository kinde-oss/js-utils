import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";
import { getUserOrganizations } from "./getUserOrganistaions";

describe("getDecodedToken idToken", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ org_codes: ["org_123456789"] }),
    );
  });
  it("error when no active storage is set", async () => {
    const idToken = await getUserOrganizations();

    expect(idToken).toStrictEqual(["org_123456789"]);
  });
});

describe("getDecodedToken idToken", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ org_codes: ["org_123456789", "org_1234567"] }),
    );
  });
  it("error when no active storage is set", async () => {
    const idToken = await getUserOrganizations();

    expect(idToken).toStrictEqual(["org_123456789", "org_1234567"]);
  });
});

describe("getDecodedToken idToken", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ org_codes: null }),
    );
  });
  it("error when no active storage is set", async () => {
    const idToken = await getUserOrganizations();

    expect(idToken).toStrictEqual(null);
  });
});
