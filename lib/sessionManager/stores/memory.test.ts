import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStorage } from "./memory";
import { StorageKeys } from "../types";

enum ExtraKeys {
  testKey = "testKey2",
}

describe("MemoryStorage standard keys", () => {
  let sessionManager: MemoryStorage;

  beforeEach(() => {
    sessionManager = new MemoryStorage();
  });

  it("should set and get an item in session storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );
  });

  it("should remove an item from session storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    await sessionManager.removeSessionItem(StorageKeys.accessToken);
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should clear all items from session storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    sessionManager.destroySession();
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should set many items", async () => {
    await sessionManager.setItems({
      [StorageKeys.accessToken]: "accessTokenValue",
      [StorageKeys.idToken]: "idTokenValue",
    });
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "accessTokenValue",
    );
    expect(await sessionManager.getSessionItem(StorageKeys.idToken)).toBe(
      "idTokenValue",
    );
  });
});

describe("MemoryStorage keys: storageKeys", () => {
  let sessionManager: MemoryStorage<ExtraKeys>;

  beforeEach(() => {
    sessionManager = new MemoryStorage<ExtraKeys>();
  });

  it("should set and get an item in storage: StorageKeys", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );
  });

  it("should remove an item from storage: StorageKeys", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    await sessionManager.removeSessionItem(StorageKeys.accessToken);
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should clear all items from storage: StorageKeys", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    sessionManager.destroySession();
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should set and get an item in extra storage", async () => {
    await sessionManager.setSessionItem(ExtraKeys.testKey, "testValue");
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBe(
      "testValue",
    );
  });

  it("should remove an item from extra storage", async () => {
    await sessionManager.setSessionItem(ExtraKeys.testKey, "testValue");
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBe(
      "testValue",
    );

    sessionManager.removeSessionItem(ExtraKeys.testKey);
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBeNull();
  });

  it("should clear all items from extra storage", async () => {
    await sessionManager.setSessionItem(ExtraKeys.testKey, "testValue");
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBe(
      "testValue",
    );

    sessionManager.destroySession();
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBeNull();
  });
});
