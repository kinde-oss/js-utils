import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IssuerRouteTypes, type LoginOptions } from "../types";
import { generateAuthUrl } from "./generateAuthUrl";

const options = {
  clientId: "client123",
  redirectURL: "https://app.example.com/callback",
  state: "state123",
  nonce: "nonce123",
  codeChallenge: "challenge123",
} satisfies LoginOptions;

const buildAuthUrl = (overrides: Partial<LoginOptions> = {}) =>
  generateAuthUrl("https://auth.example.com", IssuerRouteTypes.login, {
    ...options,
    ...overrides,
  });

describe("generateAuthUrl without Web Crypto", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", undefined);
    Reflect.deleteProperty(globalThis, "crypto");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses caller-supplied state, nonce, and PKCE challenge", async () => {
    const { url } = await buildAuthUrl({ codeChallengeMethod: "plain" });
    expect(url.searchParams.get("state")).toBe(options.state);
    expect(url.searchParams.get("nonce")).toBe(options.nonce);
    expect(url.searchParams.get("code_challenge")).toBe(options.codeChallenge);
    expect(url.searchParams.get("code_challenge_method")).toBe("plain");
  });

  it.each(["state", "nonce", "codeChallenge"] as const)(
    "requires secure randomness when %s is omitted",
    async (field) => {
      await expect(buildAuthUrl({ [field]: undefined })).rejects.toThrow(
        "Secure randomness requires crypto.getRandomValues.",
      );
    },
  );

  it("requires SHA-256 when generating a PKCE challenge", async () => {
    vi.stubGlobal("crypto", { getRandomValues: vi.fn() });
    await expect(buildAuthUrl({ codeChallenge: undefined })).rejects.toThrow(
      "Generating a PKCE challenge requires SHA-256.",
    );
  });
});
