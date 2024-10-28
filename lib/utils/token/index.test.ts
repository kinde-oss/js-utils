import { describe, expect, it } from "vitest";
import { MemoryStorage } from "../../sessionManager";
import {
  getActiveStorage,
  hasActiveStorage,
  setActiveStorage,
  clearActiveStorage,
} from ".";

describe("token index", () => {
  it("hasActiveStorage", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    expect(hasActiveStorage()).toStrictEqual(true);
  });
});

describe("token index", () => {
  it("hasActiveStorage when not set", async () => {
    clearActiveStorage();
    console.log(getActiveStorage());
    expect(hasActiveStorage()).toStrictEqual(false);
  });
});
