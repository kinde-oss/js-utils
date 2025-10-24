import { describe, expect, it, beforeEach } from "vitest";
import { getClaim, getClaimSync, setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";
import { MemoryStorage, StorageKeys } from "../../main";

const storage = new MemoryStorage();

describe("getClaim", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.removeSessionItem(StorageKeys.accessToken);
    const value = await getClaim("test");
    expect(value).toStrictEqual(null);
  });

  it("get claim string value", async () => {
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ test: "org_123456" }),
    );
    const value = await getClaim("test");
    expect(value).toStrictEqual({
      name: "test",
      value: "org_123456",
    });
  });
});

describe("getClaimSync", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", () => {
    storage.removeSessionItem(StorageKeys.accessToken);
    const value = getClaimSync("test");
    expect(value).toStrictEqual(null);
  });

  it("get claim string value", () => {
    storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ test: "org_123456" }),
    );
    const value = getClaimSync("test");
    expect(value).toStrictEqual({ name: "test", value: "org_123456" });
  });
});
