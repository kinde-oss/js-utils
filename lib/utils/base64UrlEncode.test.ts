import { describe, expect, it } from "vitest";
import { base64UrlEncode } from "./base64UrlEncode";

describe("base64UrlEncode", () => {
  it("should encode a simple string", () => {
    const input = "hello";
    const expectedOutput = "aGVsbG8";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
  });

  it("should encode a string with special characters", () => {
    const input = "hello+world/";
    const expectedOutput = "aGVsbG8rd29ybGQv";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
  });

  it("should encode an empty string", () => {
    const input = "";
    const expectedOutput = "";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
  });

  it("should encode a string with padding characters", () => {
    const input = "test";
    const expectedOutput = "dGVzdA";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
  });

  it("should encode a string with multiple padding characters", () => {
    const input = "any carnal pleas";
    const expectedOutput = "YW55IGNhcm5hbCBwbGVhcw";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
  });
});
