// utils.test.ts
import { splitString } from "./utils";
import { describe, expect, it } from "vitest";

describe("splitString", () => {
  it("should split the string into equal parts", () => {
    const str = "abcdefghij";
    const length = 2;
    const result = splitString(str, length);
    expect(result).toEqual(["ab", "cd", "ef", "gh", "ij"]);
  });

  it("should handle strings that are not perfectly divisible by the length", () => {
    const str = "abcdefghi";
    const length = 3;
    const result = splitString(str, length);
    expect(result).toEqual(["abc", "def", "ghi"]);
  });

  it("should handle an empty string", () => {
    const str = "";
    const length = 3;
    const result = splitString(str, length);
    expect(result).toEqual([]);
  });

  it("should handle a length greater than the string length", () => {
    const str = "abc";
    const length = 5;
    const result = splitString(str, length);
    expect(result).toEqual(["abc"]);
  });

  it("should handle a length of 1", () => {
    const str = "abc";
    const length = 1;
    const result = splitString(str, length);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should handle a length of 0", () => {
    const str = "abc";
    const length = 0;
    const result = splitString(str, length);
    expect(result).toEqual([]);
  });
});
