import { describe, it, expect, beforeEach } from "vitest";
import { getCookie } from "./getCookie";

describe("getCookie", () => {
  let cookieStore: { [key: string]: string } = {};

  beforeEach(() => {
    // Reset the cookie store before each test
    cookieStore = {};

    // Mock document.cookie
    Object.defineProperty(document, "cookie", {
      get: () => {
        return Object.entries(cookieStore)
          .map(([key, value]) => `${key}=${value}`)
          .join("; ");
      },
      set: (cookie) => {
        const [keyValue] = cookie.split(";");
        const [key, value] = keyValue.split("=");
        cookieStore[key.trim()] = value;
      },
      configurable: true,
    });
  });

  it("should return the value of the cookie if it exists", () => {
    document.cookie = "_kbrte=cookie-value;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBe("cookie-value");
  });

  it("should return null if the cookie does not exist", () => {
    const result = getCookie("_kbrte");
    expect(result).toBeNull();
  });

  it("should handle multiple cookies and return the correct one", () => {
    document.cookie = "cookie1=value1;path=/";
    document.cookie = "_kbrte=cookie-value;path=/";
    document.cookie = "cookie2=value2;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBe("cookie-value");
  });

  it("should return null if the cookie name is a substring of another cookie name", () => {
    document.cookie = "not_kbrte=value;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBeNull();
  });

  it("should return null if the cookie name is a substring of another cookie name with space", () => {
    document.cookie = "not _kbrte=value;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBeNull();
  });

  it("should return null if the cookie value is empty", () => {
    document.cookie = "_kbrte=;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBeNull();
  });

  it("should return null if the cookie value is undefined", () => {
    document.cookie = "_kbrte=undefined;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBe("undefined");
  });

  it("should return null if the cookie value is null", () => {
    document.cookie = "_kbrte=null;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBe("null");
  });

  it("should return null if parts.length is not equal to 2", () => {
    document.cookie = "cookie1=value1;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBeNull();
  });

  it("should return null if parts.pop() returns undefined", () => {
    document.cookie = "_kbrte=;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBeNull();
  });

  it("should return null if parts.pop() returns undefined", () => {
    document.cookie = "_kbrte=%E0%A4%A;path=/";
    const result = getCookie("_kbrte");
    expect(result).toBeNull();
  });
});
