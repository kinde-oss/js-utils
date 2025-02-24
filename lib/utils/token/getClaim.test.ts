import { describe, expect, it, beforeEach } from "vitest";
import { getClaim, setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";
import { MemoryStorage, StorageKeys } from "../../main";

const storage = new MemoryStorage();

describe("getClaim", () => {
  beforeEach(() => {
    setActiveStorage(storage);
  });

  it("when no token", async () => {
    await storage.setSessionItem(StorageKeys.accessToken, null);
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
