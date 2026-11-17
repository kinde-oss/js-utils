import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStepUpDiscoveryCache,
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

  it("is false when acr_values_supported is missing", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ issuer: "https://auth.example.com" }),
    } as Response);

    await expect(isStepUpSupported("https://other.example.com")).resolves.toBe(
      false,
    );
  });

  it("is true for phr alone and false when no recognised value is advertised", async () => {
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

    await expect(isStepUpSupported("https://stall.example.com")).resolves.toBe(
      true,
    );
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

  it("drops a failed discovery response from the cache", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    await expect(isStepUpSupported("https://down.example.com")).rejects.toThrow(
      /503/,
    );
    await expect(isStepUpSupported("https://down.example.com")).rejects.toThrow(
      /503/,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
