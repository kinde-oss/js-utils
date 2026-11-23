import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { clearActiveStorage, setActiveStorage } from "../token";
import { createMockAccessToken } from "../token/testUtils";
import {
  getAuthenticationContext,
  getAuthenticationContextSync,
  hasAuthenticationContext,
  readAuthenticationContext,
  type AuthenticationContext,
  type AuthenticationContextRequirement,
} from "./authenticationContext";
import { clearStepUpDiscoveryCache } from "./discovery";

beforeEach(() => {
  clearStepUpDiscoveryCache();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ acr_values_supported: ["mfa", "phr"] }),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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

/** The session-reading overload shares `now` with the pure check, as its third argument. */
const hasSessionContextAt = (
  requirement: AuthenticationContextRequirement,
  checkedAt: number,
): Promise<boolean> =>
  (
    hasAuthenticationContext as (
      requirement: AuthenticationContextRequirement,
      omitted: undefined,
      now: number,
    ) => Promise<boolean>
  )(requirement, undefined, checkedAt);

const holdIdTokenRead = async (authTime: number): Promise<() => void> => {
  const store = new MemoryStorage();
  setActiveStorage(store);
  await store.setSessionItem(
    StorageKeys.idToken,
    createMockAccessToken({
      acr: "mfa",
      auth_time: authTime,
    }),
  );

  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const readItem = store.getSessionItem.bind(store);
  vi.spyOn(store, "getSessionItem").mockImplementation(async (key) => {
    await pending;
    return readItem(key);
  });
  return release;
};

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

  it("fails maxAge when auth_time is in the future", () => {
    expect(
      hasAuthenticationContext(context("mfa", now + 1), { maxAge: 300 }, now),
    ).toBe(false);
    expect(
      hasAuthenticationContext(context("mfa", now + 1), { acr: "mfa" }, now),
    ).toBe(true);
  });

  it("rejects an acr other than mfa or phr", () => {
    expect(() =>
      hasAuthenticationContext(context("mfa"), {
        acr: "otp" as AuthenticationContext["acr"],
      }),
    ).toThrow(/acr must be "mfa" or "phr"/);
  });

  it("rejects a negative, non-integer, or NaN maxAge instead of skipping the check", () => {
    for (const maxAge of [-1, 1.5, Number.NaN]) {
      expect(() =>
        hasAuthenticationContext(context("mfa", now), {
          maxAge: maxAge as unknown as number,
        }),
      ).toThrow(/maxAge must be a non-negative integer/);
    }
    expect(hasAuthenticationContext(context("mfa", now - 1), {}, now)).toBe(
      true,
    );
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

  it("checks acr without reading discovery", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("discovery down"));
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        acr: "mfa",
        auth_time: Math.floor(Date.now() / 1000),
      }),
    );

    expect(await hasAuthenticationContext({ acr: "mfa" })).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    clearActiveStorage();
  });

  it("fails maxAge when discovery fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        acr: "mfa",
        auth_time: Math.floor(Date.now() / 1000),
      }),
    );

    expect(await hasAuthenticationContext({ acr: "mfa", maxAge: 300 })).toBe(
      false,
    );
    clearActiveStorage();
  });

  it("measures maxAge after the session read resolves", async () => {
    vi.useFakeTimers();
    try {
      const startedAt = 1_716_800_000;
      vi.setSystemTime(startedAt * 1000);
      const release = await holdIdTokenRead(startedAt);

      const check = hasAuthenticationContext({ maxAge: 0 });
      vi.setSystemTime((startedAt + 1) * 1000);
      release();

      expect(await check).toBe(false);
    } finally {
      clearActiveStorage();
      vi.useRealTimers();
    }
  });

  it("keeps an explicit now when the session read is slow", async () => {
    vi.useFakeTimers();
    try {
      const startedAt = 1_716_800_000;
      vi.setSystemTime(startedAt * 1000);
      const release = await holdIdTokenRead(startedAt);

      const check = hasSessionContextAt({ maxAge: 0 }, startedAt);
      vi.setSystemTime((startedAt + 1) * 1000);
      release();

      expect(await check).toBe(true);
    } finally {
      clearActiveStorage();
      vi.useRealTimers();
    }
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

  it("keeps acr and returns authTime null when discovery fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        acr: "mfa",
        amr: ["pwd", "totp"],
        auth_time: 1716800000,
      }),
    );

    expect(await getAuthenticationContext()).toEqual({
      acr: "mfa",
      amr: ["pwd", "totp"],
      authTime: null,
    });
    expect(getAuthenticationContextSync()).toEqual({
      acr: "mfa",
      amr: ["pwd", "totp"],
      authTime: null,
    });
  });

  it("returns authTime null when acr_values_supported is absent", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ issuer: "https://kinde.com" }),
    } as Response);
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        acr: "mfa",
        amr: ["pwd", "totp"],
        auth_time: 1716800000,
      }),
    );

    expect(await getAuthenticationContext()).toEqual({
      acr: "mfa",
      amr: ["pwd", "totp"],
      authTime: null,
    });
    expect(getAuthenticationContextSync()).toEqual({
      acr: "mfa",
      amr: ["pwd", "totp"],
      authTime: null,
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://kinde.com/.well-known/openid-configuration",
      expect.anything(),
    );
  });

  it("keeps the token authTime when a supported discovery result expires", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    try {
      const store = new MemoryStorage();
      setActiveStorage(store);
      await store.setSessionItem(
        StorageKeys.idToken,
        createMockAccessToken({
          acr: "mfa",
          auth_time: 1716800000,
        }),
      );

      expect(await getAuthenticationContext()).toMatchObject({
        authTime: 1716800000,
      });
      nowSpy.mockReturnValue(1_000 + 60 * 60 * 1000 + 1);
      expect(getAuthenticationContextSync()).toMatchObject({
        authTime: 1716800000,
      });
    } finally {
      nowSpy.mockRestore();
      clearActiveStorage();
    }
  });

  it("returns the token authTime until discovery has been checked", async () => {
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        acr: "mfa",
        auth_time: 1716800000,
      }),
    );

    expect(getAuthenticationContextSync()).toEqual({
      acr: "mfa",
      amr: [],
      authTime: 1716800000,
    });
    expect(fetch).not.toHaveBeenCalled();
    clearActiveStorage();
  });

  it("keeps filtering authTime when an unsupported discovery result expires", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    try {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ issuer: "https://kinde.com" }),
      } as Response);
      const store = new MemoryStorage();
      setActiveStorage(store);
      await store.setSessionItem(
        StorageKeys.idToken,
        createMockAccessToken({
          acr: "mfa",
          amr: ["pwd"],
          auth_time: 1716800000,
        }),
      );

      expect(await getAuthenticationContext()).toMatchObject({
        authTime: null,
      });

      nowSpy.mockReturnValue(1_000 + 60 * 60 * 1000 + 1);
      expect(getAuthenticationContextSync()).toMatchObject({ authTime: null });

      let resolveJson: (value: unknown) => void = () => {};
      const jsonStarted = new Promise<void>((started) => {
        vi.mocked(fetch).mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              new Promise((resolve) => {
                resolveJson = resolve;
                started();
              }),
          } as Response),
        );
      });

      const refresh = getAuthenticationContext();
      await jsonStarted;
      expect(getAuthenticationContextSync()).toMatchObject({ authTime: null });
      resolveJson({ acr_values_supported: ["mfa"] });
      expect(await refresh).toMatchObject({ authTime: 1716800000 });
      expect(getAuthenticationContextSync()).toMatchObject({
        authTime: 1716800000,
      });
    } finally {
      nowSpy.mockRestore();
      clearActiveStorage();
    }
  });

  it("clears authTime on the sync reader after discovery fails, until a document arrives", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);
    const store = new MemoryStorage();
    setActiveStorage(store);
    await store.setSessionItem(
      StorageKeys.idToken,
      createMockAccessToken({
        acr: "mfa",
        auth_time: 1716800000,
      }),
    );

    expect(await getAuthenticationContext()).toMatchObject({ authTime: null });
    expect(getAuthenticationContextSync()).toMatchObject({ authTime: null });

    let resolveJson: (value: unknown) => void = () => {};
    const jsonStarted = new Promise<void>((started) => {
      vi.mocked(fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            new Promise((resolve) => {
              resolveJson = resolve;
              started();
            }),
        } as Response),
      );
    });

    const refresh = getAuthenticationContext();
    await jsonStarted;
    expect(getAuthenticationContextSync()).toMatchObject({ authTime: null });
    resolveJson({ acr_values_supported: ["mfa"] });
    expect(await refresh).toMatchObject({ authTime: 1716800000 });
    expect(getAuthenticationContextSync()).toMatchObject({
      authTime: 1716800000,
    });
    clearActiveStorage();
  });

  it("clears authTime on the sync reader when a refresh of a supported issuer fails", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    try {
      const store = new MemoryStorage();
      setActiveStorage(store);
      await store.setSessionItem(
        StorageKeys.idToken,
        createMockAccessToken({
          acr: "mfa",
          auth_time: 1716800000,
        }),
      );
      expect(await getAuthenticationContext()).toMatchObject({
        authTime: 1716800000,
      });

      nowSpy.mockReturnValue(1_000 + 60 * 60 * 1000 + 1);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response);
      expect(await getAuthenticationContext()).toMatchObject({
        authTime: null,
      });
      expect(getAuthenticationContextSync()).toMatchObject({ authTime: null });
    } finally {
      nowSpy.mockRestore();
      clearActiveStorage();
    }
  });

  it("keeps filtering authTime when a refresh of an unsupported issuer fails", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    try {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issuer: "https://kinde.com" }),
      } as Response);
      const store = new MemoryStorage();
      setActiveStorage(store);
      await store.setSessionItem(
        StorageKeys.idToken,
        createMockAccessToken({
          acr: "mfa",
          auth_time: 1716800000,
        }),
      );
      expect(await getAuthenticationContext()).toMatchObject({
        authTime: null,
      });

      nowSpy.mockReturnValue(1_000 + 60 * 60 * 1000 + 1);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response);
      expect(await getAuthenticationContext()).toMatchObject({
        acr: "mfa",
        authTime: null,
      });
      expect(getAuthenticationContextSync()).toMatchObject({ authTime: null });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ acr_values_supported: ["mfa"] }),
      } as Response);
      expect(await getAuthenticationContext()).toMatchObject({
        authTime: 1716800000,
      });
      expect(fetch).toHaveBeenCalledTimes(3);
    } finally {
      nowSpy.mockRestore();
      clearActiveStorage();
    }
  });
});
