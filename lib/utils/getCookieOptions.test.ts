import { describe, it, expect, vi } from "vitest";

import {
  getCookieOptions,
  removeTrailingSlash,
  TWENTY_NINE_DAYS,
  MAX_COOKIE_LENGTH,
} from "./getCookieOptions";

describe("getCookieOptions", () => {
  it("returns the default configuration when env is provided", () => {
    const result = getCookieOptions(undefined, {
      NODE_ENV: "production",
      KINDE_COOKIE_DOMAIN: "example.com/",
    });

    expect(result).toMatchObject({
      maxAge: TWENTY_NINE_DAYS,
      domain: "example.com",
      maxCookieLength: MAX_COOKIE_LENGTH,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
      secure: true,
    });
  });

  it("allows consumers to override default options", () => {
    const result = getCookieOptions(
      {
        secure: false,
        sameSite: "none",
        path: "/custom",
        maxAge: 60,
        customOption: "value",
      },
      {
        NODE_ENV: "production",
        KINDE_COOKIE_DOMAIN: "example.com",
      },
    );

    expect(result.secure).toBe(false);
    expect(result.sameSite).toBe("none");
    expect(result.path).toBe("/custom");
    expect(result.maxAge).toBe(60);
    expect(result.customOption).toBe("value");
  });

  it("falls back to runtime environment variables when env param is omitted", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousCookieDomain = process.env.KINDE_COOKIE_DOMAIN;

    process.env.NODE_ENV = "production";
    process.env.KINDE_COOKIE_DOMAIN = "runtime-domain.io/";

    const result = getCookieOptions();

    expect(result.domain).toBe("runtime-domain.io");
    expect(result.secure).toBe(true);

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousCookieDomain === undefined) {
      delete process.env.KINDE_COOKIE_DOMAIN;
    } else {
      process.env.KINDE_COOKIE_DOMAIN = previousCookieDomain;
    }
  });

  it("warns when NODE_ENV is missing and secure option is not provided", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = getCookieOptions({}, {});

    expect(result.secure).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      "getCookieOptions: NODE_ENV not set; defaulting secure cookie flag to false. Provide env or override secure to suppress this warning.",
    );

    warnSpy.mockRestore();
  });

  it("warns when KINDE_COOKIE_DOMAIN resolves to an empty string", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = getCookieOptions(
      {},
      { NODE_ENV: "development", KINDE_COOKIE_DOMAIN: "   " },
    );

    expect(result.domain).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "getCookieOptions: KINDE_COOKIE_DOMAIN is empty after trimming and will be ignored.",
    );

    warnSpy.mockRestore();
  });
});

describe("removeTrailingSlash", () => {
  it("removes trailing slashes and trims whitespace", () => {
    expect(removeTrailingSlash("example.com/")).toBe("example.com");
    expect(removeTrailingSlash("  example.com/  ")).toBe("example.com");
  });

  it("returns the original string when there is no trailing slash", () => {
    expect(removeTrailingSlash("example.com")).toBe("example.com");
  });

  it("returns undefined for nullish values", () => {
    expect(removeTrailingSlash(undefined)).toBeUndefined();
    expect(removeTrailingSlash(null)).toBeUndefined();
  });

  it("returns undefined for whitespace-only strings", () => {
    expect(removeTrailingSlash("   ")).toBeUndefined();
  });
});
