import { describe, expect, it, beforeEach } from "vitest";
import { getDecodedToken, getDecodedTokenSync } from "./getDecodedToken";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { clearActiveStorage, setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";

describe("getDecodedToken", () => {
  it("return null when no active storage is defined", async () => {
    expect(await getDecodedToken("idToken")).toBe(null);
  });
});

describe("getDecodedToken", () => {
  beforeEach(() => {
    setActiveStorage(new MemoryStorage());
  });
  it("returns null when no idToken is set", async () => {
    const idToken = await getDecodedToken("idToken");
    expect(idToken).toBe(null);
  });
});

describe("getDecodedToken idToken", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    storage.setSessionItem(StorageKeys.idToken, createMockAccessToken());
  });
  it("returns the decoded idToken with the correct org_code", async () => {
    const idToken = await getDecodedToken("idToken");
    if (idToken === null) {
      throw new Error("idToken is null");
    }
    expect(idToken.org_code).toBe("org_123456789");
  });
});

describe("getDecodedToken accessToken", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    storage.setSessionItem(StorageKeys.accessToken, createMockAccessToken());
  });
  it("returns the decoded accessToken with the correct org_code", async () => {
    const accessToken = await getDecodedToken("accessToken");
    if (accessToken === null) {
      throw new Error("accessToken is null");
    }
    expect(accessToken.org_code).toBe("org_123456789");
  });
});

describe("getDecodedTokenSync", () => {
  it("return null when no active storage is defined", () => {
    clearActiveStorage();
    expect(getDecodedTokenSync("idToken")).toBe(null);
  });

  it("returns token when set on sync store", () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    storage.setSessionItem(StorageKeys.accessToken, createMockAccessToken());
    const t = getDecodedTokenSync("accessToken");
    expect(t?.org_code).toBe("org_123456789");
  });

  it("using an async storage in sync mode throws an error", () => {
    const storage = new MemoryStorage();
    storage.asyncStore = true;
    setActiveStorage(storage);
    expect(() => getDecodedTokenSync("accessToken")).toThrow(
      "Active storage is async-only. Use the async helpers.",
    );
  });
});
