import { sanitizeUrl } from "./sanitizeUrl";
import { describe, expect, it } from "vitest";

describe("sanitizeUrl", () => {
  it("should remove trailing slash from URL", () => {
    const url = "https://example.com/";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com");
  });

  it("should remove trailing slash from URL with path", () => {
    const url = "https://example.com/api/v1/";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com/api/v1");
  });

  it("should not change URL without trailing slash", () => {
    const url = "https://example.com";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com");
  });

  it("should not change URL with path without trailing slash", () => {
    const url = "https://example.com/api/v1";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com/api/v1");
  });

  it("should replace multiple consecutive slashes with single slash", () => {
    const url = "http://www.google.com/////hello///bob";
    const result = sanitizeUrl(url);
    expect(result).toBe("http://www.google.com/hello/bob");
  });

  it("should preserve protocol double slash", () => {
    const url = "https://example.com//path";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com/path");
  });

  it("should handle multiple slashes in path and remove trailing slash", () => {
    const url = "https://example.com//api///v1//users///";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com/api/v1/users");
  });

  it("should handle multiple slashes at the beginning of path", () => {
    const url = "https://example.com///path";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com/path");
  });

  it("should handle multiple slashes in the middle of path", () => {
    const url = "https://example.com/api//v1/users";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com/api/v1/users");
  });

  it("should handle multiple slashes at the end of path", () => {
    const url = "https://example.com/path///";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com/path");
  });

  it("should handle complex URL with multiple slashes throughout", () => {
    const url = "https://api.example.com//v1///users//123///posts//";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://api.example.com/v1/users/123/posts");
  });

  it("should handle URL with query parameters and multiple slashes", () => {
    const url = "https://example.com//api///search?q=test&page=1//";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com/api/search?q=test&page=1");
  });

  it("should handle URL with fragment and multiple slashes", () => {
    const url = "https://example.com//page///#section1//";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com/page/#section1");
  });

  it("should handle empty string", () => {
    const url = "";
    const result = sanitizeUrl(url);
    expect(result).toBe("");
  });

  it("should handle URL with only slashes", () => {
    const url = "////";
    const result = sanitizeUrl(url);
    expect(result).toBe("/");
  });

  it("should handle protocol-relative URL with multiple slashes", () => {
    const url = "//example.com//api//v1//users//";
    const result = sanitizeUrl(url);
    expect(result).toBe("//example.com/api/v1/users");
  });

  it("should handle relative URL with multiple slashes (not protocol-relative)", () => {
    const url = "///api//v1//users//";
    const result = sanitizeUrl(url);
    expect(result).toBe("/api/v1/users");
  });

  it("should handle URL with port and multiple slashes", () => {
    const url = "https://example.com:8080//api//v1//";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://example.com:8080/api/v1");
  });

  it("should handle URL with subdomain and multiple slashes", () => {
    const url = "https://api.v1.example.com//users//123//";
    const result = sanitizeUrl(url);
    expect(result).toBe("https://api.v1.example.com/users/123");
  });

  it("should preserve protocol-relative URLs for deep linking", () => {
    const url = "//myapp.com//deep//link//";
    const result = sanitizeUrl(url);
    expect(result).toBe("//myapp.com/deep/link");
  });

  it("should handle protocol-relative URL with query parameters", () => {
    const url = "//api.example.com//v1//users?param=value//";
    const result = sanitizeUrl(url);
    expect(result).toBe("//api.example.com/v1/users?param=value");
  });

  it("should handle protocol-relative URL with fragment", () => {
    const url = "//example.com//page//#section1//";
    const result = sanitizeUrl(url);
    expect(result).toBe("//example.com/page/#section1");
  });
});
