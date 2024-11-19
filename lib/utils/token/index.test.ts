import { describe, expect, it, beforeEach } from "vitest";
import { MemoryStorage } from "../../sessionManager";
import {
  getActiveStorage,
  hasActiveStorage,
  setActiveStorage,
  clearActiveStorage,
  setInsecureStorage,
  hasInsecureStorage,
  clearInsecureStorage,
  getInsecureStorage,
} from ".";

describe("token index", () => {
  beforeEach(() => {
    clearActiveStorage();
    clearInsecureStorage();
  });

  it("hasActiveStorage returns true when storage is set", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    expect(hasActiveStorage()).toStrictEqual(true);
  });

  it("hasActiveStorage returns false when storage is cleared", async () => {
    clearActiveStorage();
    expect(hasActiveStorage()).toStrictEqual(false);
  });

  it("getActiveStorage returns null when no storage is set", async () => {
    clearActiveStorage();
    expect(getActiveStorage()).toBeNull();
  });

  it("getActiveStorage returns storage instance when set", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    expect(getActiveStorage()).toBe(storage);
  });

  it("hasInsecureStorage returns true when insecure storage is set", async () => {
    const storage = new MemoryStorage();
    setInsecureStorage(storage);
    expect(hasInsecureStorage()).toStrictEqual(true);
  });

  it("hasInsecureStorage returns false when insecure storage is cleared", async () => {
    clearInsecureStorage();
    expect(hasInsecureStorage()).toStrictEqual(false);
  });

  it("getInsecureStorage returns null when no insecure storage is set", async () => {
    clearInsecureStorage();
    clearActiveStorage();
    expect(getInsecureStorage()).toBeNull();
  });

  it("getInsecureStorage returns active storage when no insecure storage is set", async () => {
    clearInsecureStorage();
    expect(getInsecureStorage()).toBeNull();
  });

  it("getInsecureStorage returns storage instance when set", async () => {
    const storage = new MemoryStorage();
    setInsecureStorage(storage);
    expect(getInsecureStorage()).toBe(storage);
  });
});
