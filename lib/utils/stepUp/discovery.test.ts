import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearStepUpDiscoveryCache, isStepUpSupported } from "./discovery";

describe("isStepUpSupported", () => {
  beforeEach(() => {
    clearStepUpDiscoveryCache();
    vi.stubGlobal("fetch", vi.fn());
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
