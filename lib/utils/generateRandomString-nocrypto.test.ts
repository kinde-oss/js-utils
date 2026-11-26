import { generateRandomString } from "./generateRandomString";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

describe("generateRandomString - no crypto", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back when the crypto global is absent", () => {
    Reflect.deleteProperty(globalThis, "crypto");
    expect("crypto" in globalThis).toBe(false);
    expect(generateRandomString(10)).toHaveLength(10);
  });

  it("falls back when crypto has no getRandomValues method", () => {
    vi.stubGlobal("crypto", {});
    expect(generateRandomString(10)).toHaveLength(10);
  });
  it("should generate a string of the specified length", () => {
    const length = 10;
    const result = generateRandomString(length);
    expect(result).toHaveLength(length);
  });

  it("should generate a string containing only valid characters", () => {
    const length = 20;
    const result = generateRandomString(length);
    const validCharacters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (const char of result) {
      expect(validCharacters).toContain(char);
    }
  });

  it("should generate different strings on subsequent calls", () => {
    const length = 15;
    const result1 = generateRandomString(length);
    const result2 = generateRandomString(length);
    expect(result1).not.toBe(result2);
  });

  it("should handle a length of 0", () => {
    const length = 0;
    const result = generateRandomString(length);
    expect(result).toHaveLength(0);
  });

  it("should handle a large length", () => {
    const length = 1000;
    const result = generateRandomString(length);
    expect(result).toHaveLength(length);
  });
});
