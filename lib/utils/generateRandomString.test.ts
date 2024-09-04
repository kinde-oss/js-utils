import { generateRandomString } from "./generateRandomString";
import { describe, it, expect } from "vitest";

describe("generateRandomString", () => {
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
