import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cachedStepUpSupported,
  clearStepUpDiscoveryCache,
  DISCOVERY_FAILURE_TTL_MS,
  DISCOVERY_TIMEOUT_MS,
  isStepUpSupported,
} from "./discovery";

const supportedDiscovery = () =>
  ({
    ok: true,
    json: async () => ({ acr_values_supported: ["mfa"] }),
  }) as Response;

describe("isStepUpSupported", () => {
  beforeEach(() => {
    clearStepUpDiscoveryCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is true when acr_values_supported lists mfa or phr", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ acr_values_supported: ["mfa", "phr"] }),
    } as Response);

    await expect(isStepUpSupported("https://auth.example.com")).resolves.toBe(
      true,
    );
    await expect(isStepUpSupported("https://auth.example.com/")).resolves.toBe(
      true,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://auth.example.com/.well-known/openid-configuration",
    );
  });

  it("treats a non-object discovery body as a failed fetch", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    try {
      for (const body of [null, [], "openid", 1, true]) {
        clearStepUpDiscoveryCache();
        vi.mocked(fetch).mockClear();
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          json: async () => body,
        } as Response);

        await expect(
          isStepUpSupported("https://bad.example.com"),
        ).rejects.toThrow(/not an object/);
        expect(cachedStepUpSupported("https://bad.example.com")).toBe(false);
        await expect(
          isStepUpSupported("https://bad.example.com"),
        ).rejects.toThrow(/not an object/);
        expect(fetch).toHaveBeenCalledTimes(1);

        nowSpy.mockReturnValue(1_000 + DISCOVERY_FAILURE_TTL_MS);
        await expect(
          isStepUpSupported("https://bad.example.com"),
        ).rejects.toThrow(/not an object/);
        expect(fetch).toHaveBeenCalledTimes(2);
        nowSpy.mockReturnValue(1_000);
      }
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("is false when acr_values_supported is missing", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ issuer: "https://auth.example.com" }),
    } as Response);

    await expect(isStepUpSupported("https://other.example.com")).resolves.toBe(
      false,
    );
  });

  it("is true whenever acr_values_supported is present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ acr_values_supported: ["phr"] }),
    } as Response);
    await expect(isStepUpSupported("https://phr.example.com")).resolves.toBe(
      true,
    );

    clearStepUpDiscoveryCache();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ acr_values_supported: ["otp"] }),
    } as Response);
    await expect(isStepUpSupported("https://otp.example.com")).resolves.toBe(
      true,
    );

    clearStepUpDiscoveryCache();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ acr_values_supported: [] }),
    } as Response);
    await expect(isStepUpSupported("https://empty.example.com")).resolves.toBe(
      true,
    );

    clearStepUpDiscoveryCache();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ acr_values_supported: null }),
    } as Response);
    await expect(isStepUpSupported("https://null.example.com")).resolves.toBe(
      false,
    );
  });

  it("shares an in-flight request and rediscovers after the cache expires", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ acr_values_supported: ["mfa"] }),
    } as Response);
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);

    await Promise.all([
      isStepUpSupported("https://ttl.example.com"),
      isStepUpSupported("https://ttl.example.com"),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(1_000 + 60 * 60 * 1000 - 1);
    await isStepUpSupported("https://ttl.example.com");
    expect(fetch).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(1_000 + 60 * 60 * 1000 + 1);
    await isStepUpSupported("https://ttl.example.com");
    expect(fetch).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it("keeps a newer cache entry when an older request fails", async () => {
    let failFirst: (response: Response) => void = () => {};
    vi.mocked(fetch)
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            failFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ acr_values_supported: ["mfa"] }),
      } as Response);

    const first = isStepUpSupported("https://race.example.com");
    clearStepUpDiscoveryCache();
    await expect(isStepUpSupported("https://race.example.com")).resolves.toBe(
      true,
    );
    failFirst({ ok: false, status: 500 } as Response);
    await expect(first).rejects.toThrow(/500/);

    await expect(isStepUpSupported("https://race.example.com")).resolves.toBe(
      true,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("drops a stalled discovery request so a later attempt can recover", async () => {
    vi.useFakeTimers();
    let fetches = 0;
    let stalledSignal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_url, init) => {
      fetches += 1;
      if (fetches === 1) {
        stalledSignal = init?.signal ?? undefined;
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        });
      }
      return Promise.resolve(supportedDiscovery());
    });

    const first = isStepUpSupported("https://stall.example.com");
    const second = isStepUpSupported("https://stall.example.com");
    expect(cachedStepUpSupported("https://stall.example.com")).toBeUndefined();
    const settled = Promise.allSettled([first, second]);
    await vi.advanceTimersByTimeAsync(DISCOVERY_TIMEOUT_MS);

    const [firstResult, secondResult] = await settled;
    expect(firstResult.status).toBe("rejected");
    expect(secondResult.status).toBe("rejected");
    if (
      firstResult.status === "rejected" &&
      secondResult.status === "rejected"
    ) {
      expect(secondResult.reason).toBe(firstResult.reason);
      expect(firstResult.reason).toMatchObject({
        name: "TimeoutError",
        message:
          "OpenID configuration request timed out for https://stall.example.com",
      });
    }
    expect(stalledSignal?.aborted).toBe(true);
    expect(cachedStepUpSupported("https://stall.example.com")).toBe(false);

    await expect(
      isStepUpSupported("https://stall.example.com"),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    expect(fetches).toBe(1);

    await vi.advanceTimersByTimeAsync(DISCOVERY_FAILURE_TTL_MS);
    await expect(isStepUpSupported("https://stall.example.com")).resolves.toBe(
      true,
    );
    expect(cachedStepUpSupported("https://stall.example.com")).toBe(true);
    expect(fetches).toBe(2);
  });

  it("drops a stalled discovery body and ignores a late response", async () => {
    vi.useFakeTimers();
    let fetches = 0;
    let resolveJson: (value: unknown) => void = () => {};
    vi.mocked(fetch).mockImplementation(() => {
      fetches += 1;
      if (fetches === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            new Promise((resolve) => {
              resolveJson = resolve;
            }),
        } as Response);
      }
      return Promise.resolve(supportedDiscovery());
    });

    const pending = isStepUpSupported("https://body.example.com");
    const failed = expect(pending).rejects.toMatchObject({
      name: "TimeoutError",
      message:
        "OpenID configuration request timed out for https://body.example.com",
    });
    await vi.advanceTimersByTimeAsync(DISCOVERY_TIMEOUT_MS);
    resolveJson({ acr_values_supported: ["mfa"] });
    await failed;
    await vi.advanceTimersByTimeAsync(DISCOVERY_FAILURE_TTL_MS);
    await expect(isStepUpSupported("https://body.example.com")).resolves.toBe(
      true,
    );
    expect(fetches).toBe(2);
  });

  it("keeps a newer cache entry when an older discovery request times out", async () => {
    vi.useFakeTimers();
    let fetches = 0;
    vi.mocked(fetch).mockImplementation((_url, init) => {
      fetches += 1;
      if (fetches === 1) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        });
      }
      return Promise.resolve(supportedDiscovery());
    });

    const first = isStepUpSupported("https://race-timeout.example.com");
    const failed = expect(first).rejects.toMatchObject({
      name: "TimeoutError",
    });
    clearStepUpDiscoveryCache();
    await expect(
      isStepUpSupported("https://race-timeout.example.com"),
    ).resolves.toBe(true);

    await vi.advanceTimersByTimeAsync(DISCOVERY_TIMEOUT_MS);
    await failed;
    await expect(
      isStepUpSupported("https://race-timeout.example.com"),
    ).resolves.toBe(true);
    expect(fetches).toBe(2);
  });

  it("reuses a failed discovery fetch briefly and keeps it visible to sync readers", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    try {
      expect(cachedStepUpSupported("https://down.example.com")).toBeUndefined();
      await expect(
        isStepUpSupported("https://down.example.com"),
      ).rejects.toThrow(/503/);
      expect(cachedStepUpSupported("https://down.example.com")).toBe(false);
      await expect(
        isStepUpSupported("https://down.example.com"),
      ).rejects.toThrow(/503/);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(cachedStepUpSupported("https://down.example.com")).toBe(false);

      nowSpy.mockReturnValue(1_000 + DISCOVERY_FAILURE_TTL_MS);
      await expect(
        isStepUpSupported("https://down.example.com"),
      ).rejects.toThrow(/503/);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(cachedStepUpSupported("https://down.example.com")).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("keeps a failed discovery visible to sync readers until a document arrives", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    try {
      await expect(
        isStepUpSupported("https://down.example.com"),
      ).rejects.toThrow(/503/);
      nowSpy.mockReturnValue(1_000 + DISCOVERY_FAILURE_TTL_MS);

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

      const retry = isStepUpSupported("https://down.example.com");
      await jsonStarted;
      expect(cachedStepUpSupported("https://down.example.com")).toBe(false);
      resolveJson({ acr_values_supported: ["mfa"] });
      await expect(retry).resolves.toBe(true);
      expect(cachedStepUpSupported("https://down.example.com")).toBe(true);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
