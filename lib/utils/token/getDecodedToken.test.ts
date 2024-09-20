import { describe, expect, it, beforeEach } from "vitest";
import { getDecodedToken } from "./getDecodedToken";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";

describe("getDecodedToken", () => {
  it("error when no active storage is set", () => {
    expect(() => getDecodedToken("idToken")).rejects.toThrowError(
      "Session manager is not initialized",
    );
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
