import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { clearActiveStorage, setActiveStorage } from "../token";
import { createMockAccessToken } from "../token/testUtils";
import {
  getAuthenticationContext,
  getAuthenticationContextSync,
  hasAuthenticationContext,
  readAuthenticationContext,
  type AuthenticationContext,
} from "./authenticationContext";

const now = 1_716_800_000;

const context = (
  acr: AuthenticationContext["acr"],
  authTime: number | null = now,
  amr: string[] = [],
): AuthenticationContext => ({
  acr,
  amr,
  authTime,
});

describe("hasAuthenticationContext", () => {
  it("treats an absent acr as baseline", () => {
    expect(hasAuthenticationContext(context(null), {}, now)).toBe(true);
    expect(hasAuthenticationContext(context(null), { acr: "mfa" }, now)).toBe(
      false,
    );
  });

  it("lets mfa meet mfa and not phr", () => {
    expect(hasAuthenticationContext(context("mfa"), { acr: "mfa" }, now)).toBe(
      true,
    );
    expect(hasAuthenticationContext(context("mfa"), { acr: "phr" }, now)).toBe(
      false,
    );
  });

  it("lets phr meet mfa", () => {
    expect(hasAuthenticationContext(context("phr"), { acr: "mfa" }, now)).toBe(
      true,
    );
    expect(hasAuthenticationContext(context("phr"), { acr: "phr" }, now)).toBe(
      true,
    );
  });

  it("fails maxAge when auth_time is missing", () => {
    expect(
      hasAuthenticationContext(context("phr", null), { maxAge: 300 }, now),
    ).toBe(false);
    expect(
      hasAuthenticationContext(context(null, null), { maxAge: 0 }, now),
    ).toBe(false);
  });

  it("compares maxAge to auth_time and ignores amr", () => {
    expect(
      hasAuthenticationContext(
        context("mfa", now - 300, ["pop"]),
        { acr: "mfa", maxAge: 300 },
        now,
      ),
    ).toBe(true);
    expect(
      hasAuthenticationContext(context("mfa", now - 301), { maxAge: 300 }, now),
    ).toBe(false);
    expect(
      hasAuthenticationContext(context("mfa", now), { maxAge: 0 }, now),
    ).toBe(true);
    expect(
      hasAuthenticationContext(context("mfa", now - 1), { maxAge: 0 }, now),
    ).toBe(false);
    expect(
      hasAuthenticationContext(
        { acr: null, amr: ["pop"], authTime: now },
        { acr: "mfa" },
        now,
      ),
    ).toBe(false);
  });

  it("rejects an acr other than mfa or phr", () => {
    expect(() =>
      hasAuthenticationContext(context("mfa"), {
        acr: "otp" as AuthenticationContext["acr"],
      }),
    ).toThrow(/acr must be "mfa" or "phr"/);
  });

  it("requires both arguments when the first value is a context", () => {
    expect(() => hasAuthenticationContext(context(null))).toThrow(
      /needs both the context and the requirement/,
    );
  });

  it("reads the current session when only a requirement is passed", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);
    expect(await hasAuthenticationContext({ acr: "mfa" })).toBe(false);

    const authTime = Math.floor(Date.now() / 1000);
    await store.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        acr: "mfa",
        amr: ["pwd", "totp"],
        auth_time: authTime,
      }),
    );

    expect(await hasAuthenticationContext({ acr: "mfa", maxAge: 300 })).toBe(
      true,
    );
    expect(await hasAuthenticationContext({ acr: "phr" })).toBe(false);
    clearActiveStorage();
  });
});

describe("getAuthenticationContext", () => {
  beforeEach(() => {
    clearActiveStorage();
  });

  it("returns null when there is no token", async () => {
    setActiveStorage(new MemoryStorage());
    expect(await getAuthenticationContext()).toBeNull();
  });

  it("returns null acr and an empty amr when the claims are absent", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({ auth_time: 1716800000 }),
    );

    expect(await getAuthenticationContext()).toEqual({
      acr: null,
      amr: [],
      authTime: 1716800000,
    });
  });

  it("reads auth_time from the ID token when the access token differs", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setItems({
      [StorageKeys.idToken]: createMockAccessToken({
        acr: "mfa",
        amr: ["pwd", "totp"],
        auth_time: 1716800000,
      }),
      [StorageKeys.accessToken]: createMockAccessToken({
        acr: "phr",
        amr: ["passkey"],
        auth_time: 111,
      }),
    });

    expect(await getAuthenticationContext()).toEqual({
      acr: "mfa",
      amr: ["pwd", "totp"],
      authTime: 1716800000,
    });
    expect(getAuthenticationContextSync()).toEqual({
      acr: "mfa",
      amr: ["pwd", "totp"],
      authTime: 1716800000,
    });
  });

  it("uses the access token when there is no ID token", () => {
    expect(
      readAuthenticationContext({
        accessToken: { acr: "phr", amr: ["passkey"], auth_time: 50 },
      }),
    ).toEqual({
      acr: "phr",
      amr: ["passkey"],
      authTime: 50,
    });
  });

  it("ignores amr entries that are not strings and an unknown acr", () => {
    expect(
      readAuthenticationContext({
        idToken: { acr: "otp", amr: ["pwd", 1], auth_time: "1716800000" },
      }),
    ).toEqual({
      acr: null,
      amr: ["pwd"],
      authTime: null,
    });
  });

  it("does not take auth_time from the access token when the ID token omits it", () => {
    expect(
      readAuthenticationContext({
        idToken: { acr: "mfa" },
        accessToken: { auth_time: 50, acr: "phr" },
      }),
    ).toEqual({
      acr: "mfa",
      amr: [],
      authTime: null,
    });
  });
});
