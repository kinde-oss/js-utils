import { describe, it, expect } from "vitest";

import {
  getCookieOptions,
  TWENTY_NINE_DAYS,
  GLOBAL_COOKIE_OPTIONS,
} from "./getCookieOptions";
import { storageSettings } from "../sessionManager/index";

describe("getCookieOptions", () => {
  it("returns the default configuration when no options provided", () => {
    const result = getCookieOptions();

    expect(result).toMatchObject({
      maxAge: TWENTY_NINE_DAYS,
      maxCookieLength: storageSettings.maxLength,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });

  it("allows consumers to override default options", () => {
    const result = getCookieOptions({
      secure: true,
      sameSite: "none",
      path: "/custom",
      maxAge: 60,
      domain: "example.com",
    });

    expect(result.secure).toBe(true);
    expect(result.sameSite).toBe("none");
    expect(result.path).toBe("/custom");
    expect(result.maxAge).toBe(60);
    expect(result.domain).toBe("example.com");
  });

  it("preserves GLOBAL_COOKIE_OPTIONS when not overridden", () => {
    const result = getCookieOptions({ domain: "test.com" });

    expect(result.httpOnly).toBe(GLOBAL_COOKIE_OPTIONS.httpOnly);
    expect(result.sameSite).toBe(GLOBAL_COOKIE_OPTIONS.sameSite);
    expect(result.path).toBe(GLOBAL_COOKIE_OPTIONS.path);
    expect(result.maxAge).toBe(GLOBAL_COOKIE_OPTIONS.maxAge);
    expect(result.maxCookieLength).toBe(GLOBAL_COOKIE_OPTIONS.maxCookieLength);
    expect(result.domain).toBe("test.com");
  });

  it("user options take precedence over defaults", () => {
    const result = getCookieOptions({
      httpOnly: false,
      maxAge: 1000,
    });

    expect(result.httpOnly).toBe(false);
    expect(result.maxAge).toBe(1000);
    // Other defaults remain
    expect(result.sameSite).toBe("lax");
    expect(result.path).toBe("/");
  });
});

describe("GLOBAL_COOKIE_OPTIONS", () => {
  it("contains secure defaults", () => {
    expect(GLOBAL_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(GLOBAL_COOKIE_OPTIONS.sameSite).toBe("lax");
    expect(GLOBAL_COOKIE_OPTIONS.path).toBe("/");
    expect(GLOBAL_COOKIE_OPTIONS.maxAge).toBe(TWENTY_NINE_DAYS);
    expect(GLOBAL_COOKIE_OPTIONS.maxCookieLength).toBe(
      storageSettings.maxLength,
    );
  });
});
