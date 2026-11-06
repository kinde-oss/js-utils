import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssuerRouteTypes, PromptTypes } from "../../types";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { clearActiveStorage, setActiveStorage } from "../token";
import { clearStepUpDiscoveryCache } from "./discovery";
import { readStepUpState } from "./state";
import { stepUp } from "./stepUp";

const domain = "https://auth.example.com";

const loginOptions = {
  clientId: "client123",
  redirectURL: "https://app.example.com/callback",
  state: "state123",
  codeChallenge: "challenge123",
};

const supportStepUp = () => {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ acr_values_supported: ["mfa", "phr"] }),
  } as Response);
};

describe("stepUp", () => {
  beforeEach(() => {
    clearStepUpDiscoveryCache();
    clearActiveStorage();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("builds an interactive request and does not send prompt=none", async () => {
    supportStepUp();
    const store = new MemoryStorage();
    setActiveStorage(store);

    const result = await stepUp(domain, {
      ...loginOptions,
      acr: "mfa",
      maxAge: 300,
    });

    expect(result.url.pathname).toBe("/oauth2/auth");
    expect(result.url.searchParams.get("acr_values")).toBe("mfa");
    expect(result.url.searchParams.get("max_age")).toBe("300");
    expect(result.url.searchParams.get("prompt")).toBeNull();
    expect(result.url.searchParams.get("code_challenge")).toBe("challenge123");
    expect(result.url.searchParams.get("state")).toBe("state123");
    expect(await store.getSessionItem(StorageKeys.state)).toBe("state123");
    expect(await store.getSessionItem(StorageKeys.stepUpAcr)).toBe("mfa");
    expect(await store.getSessionItem(StorageKeys.stepUpMaxAge)).toBe("300");
  });

  it("throws when prompt=none is passed directly", async () => {
    await expect(
      stepUp(domain, {
        ...loginOptions,
        acr: "mfa",
        prompt: PromptTypes.none,
      }),
    ).rejects.toThrow(/prompt=none/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when prompt=none is passed through additional parameters", async () => {
    await expect(
      stepUp(domain, {
        ...loginOptions,
        acr: "phr",
        parameters: { prompt: "none" },
      }),
    ).rejects.toThrow(/prompt=none/);

    await expect(
      stepUp(domain, {
        ...loginOptions,
        maxAge: 0,
        properties: { prompt: "none" } as Record<string, string>,
      }),
    ).rejects.toThrow(/prompt=none/);

    await expect(
      stepUp(domain, {
        ...loginOptions,
        acr: "mfa",
        reauthState: btoa(JSON.stringify({ prompt: "none" })),
      }),
    ).rejects.toThrow(/prompt=none/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when neither acr nor maxAge is set", async () => {
    await expect(stepUp(domain, loginOptions)).rejects.toThrow(
      /requires acr or maxAge/,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws for an invalid maxAge before discovery or the URL", async () => {
    await expect(
      stepUp(domain, { ...loginOptions, maxAge: -1 }),
    ).rejects.toThrow(/non-negative integer/);
    await expect(
      stepUp(domain, { ...loginOptions, maxAge: 1.5 }),
    ).rejects.toThrow(/non-negative integer/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("carries returnTo through state", async () => {
    supportStepUp();

    const result = await stepUp(domain, {
      ...loginOptions,
      acr: "mfa",
      returnTo: "https://app.example.com/payouts",
    });

    expect(readStepUpState(result.state)).toEqual({
      state: "state123",
      returnTo: "https://app.example.com/payouts",
    });
    expect(result.url.searchParams.get("state")).toBe(result.state);
    expect(readStepUpState("state123")).toEqual({ state: "state123" });
  });

  it("throws when discovery does not advertise acr_values_supported", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ issuer: domain }),
    } as Response);

    await expect(
      stepUp(domain, { ...loginOptions, acr: "mfa", maxAge: 0 }),
    ).rejects.toThrow(/not supported/);
  });

  it("falls back to prompt=login for maxAge when step-up is not supported", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await stepUp(domain, {
      ...loginOptions,
      maxAge: 300,
    });

    expect(result.url.searchParams.get("prompt")).toBe(PromptTypes.login);
    expect(result.url.searchParams.has("max_age")).toBe(false);
    expect(result.url.searchParams.has("acr_values")).toBe(false);
  });

  it("uses the login route rather than registration", async () => {
    supportStepUp();
    const result = await stepUp(domain, { ...loginOptions, acr: "phr" });
    expect(result.url.pathname).toBe("/oauth2/auth");
    expect(result.url.searchParams.get("prompt")).not.toBe(
      IssuerRouteTypes.register,
    );
    expect(result.url.searchParams.get("acr_values")).toBe("phr");
  });
});
