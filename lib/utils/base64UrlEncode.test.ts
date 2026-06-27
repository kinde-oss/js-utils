import { describe, expect, it } from "vitest";
import { base64UrlEncode, base64UrlDecode } from "./base64UrlEncode";

describe("base64UrlEncode", () => {
  it("should encode a simple string (base64url: no padding)", () => {
    const input = "hello";
    const expectedOutput = "aGVsbG8";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
  });

  it("should replace + and / with - and _", () => {
    const input = Uint8Array.from([251, 255]).buffer;
    const expectedOutput = "-_8";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
    expect(result).not.toContain("+");
    expect(result).not.toContain("/");
    expect(result).not.toMatch(/=$/);
  });

  it("should encode an empty string", () => {
    const input = "";
    const expectedOutput = "";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
  });

  it("should encode a string (base64url strips padding)", () => {
    const input = "test";
    const expectedOutput = "dGVzdA";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
    expect(result).not.toMatch(/=$/);
  });

  it("should encode a string with multiple padding characters (base64url strips padding)", () => {
    const input = "any carnal pleas";
    const expectedOutput = "YW55IGNhcm5hbCBwbGVhcw";
    const result = base64UrlEncode(input);
    expect(result).toBe(expectedOutput);
  });

  it("should encode when passed an ArrayBuffer (base64url)", () => {
    const buffer = new ArrayBuffer(8);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = i + 1;
    }

    const expectedOutput = "AQIDBAUGBwg";
    const result = base64UrlEncode(buffer);
    expect(result).toBe(expectedOutput);
    expect(result).not.toMatch(/=$/);
  });
});

describe("base64UrlDecode", () => {
  it("should decode base64url back to string (round-trip)", () => {
    const input = "hello";
    const encoded = base64UrlEncode(input);
    expect(base64UrlDecode(encoded)).toBe(input);
  });

  it("should decode base64url with - and _ (no padding)", () => {
    const base64url = "aGVsbG8";
    expect(base64UrlDecode(base64url)).toBe("hello");
  });

  it("should decode base64url that atob would reject (URL-safe chars)", () => {
    const base64url =
      "eyJraW5kZSI6eyJldmVudCI6ImxvZ2luIn0sInVzZXJfdHlwZSI6ImNsaWVudCIsInJlZGlyZWN0X3VyaSI6Imh0dHA6Ly9sb2NhbGhvc3Q6NzAwMS8_dXNlcl90eXBlPWNsaWVudCIsInV0bSI6Int9In0";
    const decoded = base64UrlDecode(base64url);
    expect(decoded).toContain("redirect_uri");
    expect(decoded).toContain("?user_type=client");
    const parsed = JSON.parse(decoded);
    expect(parsed.redirect_uri).toBe("http://localhost:7001/?user_type=client");
  });

  it("should decode empty string", () => {
    expect(base64UrlDecode("")).toBe("");
  });
});
