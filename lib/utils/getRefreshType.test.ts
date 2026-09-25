import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getRefreshType } from "./getRefreshType";
import { storageSettings } from "../sessionManager";
import { RefreshType } from "../types";

describe("getRefreshType", () => {
  const kindeDomain = "test.kinde.com";
  const customDomain = "auth.example.com";
  let cookieStore: { [key: string]: string } = {};

  beforeEach(() => {
    cookieStore = {};

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

  afterEach(() => {
    storageSettings.useInsecureForRefreshToken = false;
  });

  it("returns cookie refresh type on a custom domain with the _kbrte cookie present", () => {
    document.cookie = "_kbrte=cookie-value;path=/";

    expect(getRefreshType(customDomain)).toBe(RefreshType.cookie);
  });

  it("returns refreshToken type on a custom domain without the _kbrte cookie", () => {
    expect(getRefreshType(customDomain)).toBe(RefreshType.refreshToken);
  });

  it("returns refreshToken type on a kinde.com domain even with the _kbrte cookie present", () => {
    document.cookie = "_kbrte=cookie-value;path=/";

    expect(getRefreshType(kindeDomain)).toBe(RefreshType.refreshToken);
  });

  it("returns refreshToken type on a custom domain with the cookie present when useInsecureForRefreshToken is true", () => {
    storageSettings.useInsecureForRefreshToken = true;
    document.cookie = "_kbrte=cookie-value;path=/";

    expect(getRefreshType(customDomain)).toBe(RefreshType.refreshToken);
  });
});
