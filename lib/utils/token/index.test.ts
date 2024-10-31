import { describe, expect, it } from "vitest";
import { MemoryStorage } from "../../sessionManager";
import {
  getActiveStorage,
  hasActiveStorage,
  setActiveStorage,
  clearActiveStorage,
} from ".";
describe("token index", () => {
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
});
