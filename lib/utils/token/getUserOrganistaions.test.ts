import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage, getUserOrganizations } from ".";
import { createMockAccessToken } from "./testUtils";

const storage = new MemoryStorage();

describe("getUserOrganizations", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("When single org", async () => {
    await storage.setSessionItem(StorageKeys.idToken, null);
    const idToken = await getUserOrganizations();

    expect(idToken).toStrictEqual(null);
  });

  it("When single org", async () => {
    await storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ org_codes: ["org_123456789"] }),
    );
    const idToken = await getUserOrganizations();

    expect(idToken).toStrictEqual(["org_123456789"]);
  });

  it("When multiple org", async () => {
    await storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ org_codes: ["org_123456789", "org_1234567"] }),
    );
    const idToken = await getUserOrganizations();

    expect(idToken).toStrictEqual(["org_123456789", "org_1234567"]);
  });

  it("when no orgs", async () => {
    await storage.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ org_codes: null }),
    );
    const idToken = await getUserOrganizations();

    expect(idToken).toStrictEqual(null);
  });
});
