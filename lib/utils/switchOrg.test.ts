import { describe, it, expect, vi, afterEach } from "vitest";
import { IssuerRouteTypes, PromptTypes } from "../types";

vi.mock("./generateAuthUrl", () => {
  return {
    generateAuthUrl: vi.fn().mockResolvedValue({
      url: new URL(
        "https://auth.example.com/oauth2/auth?client_id=mock&response_type=code&redirect_uri=https%3A%2F%2Fredirect.example.com&audience=&scope=openid+profile&prompt=none&state=mockstate&nonce=mocknonce&code_challenge=mockchallenge&code_challenge_method=S256&org_code=org_123",
      ),
      state: "mockstate",
      nonce: "mocknonce",
      codeChallenge: "mockchallenge",
      codeVerifier: "mockverifier",
    }),
  };
});

import { generateAuthUrl } from "./generateAuthUrl";
import { switchOrg } from "./switchOrg";

describe("switchOrg", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("throws when orgCode is missing", async () => {
    await expect(
      // @ts-expect-error testing runtime validation
      switchOrg({
        domain: "https://auth.example.com",
        redirectURL: "https://redirect.example.com",
      }),
    ).rejects.toThrow("Org code is required for switchOrg");
  });

  it("throws when redirectURL is missing", async () => {
    await expect(
      // @ts-expect-error testing runtime validation
      switchOrg({ domain: "https://auth.example.com", orgCode: "org_123" }),
    ).rejects.toThrow("Redirect URL is required for switchOrg");
  });

  it("calls generateAuthUrl with correct args and returns its result", async () => {
    const domain = "https://auth.example.com";
    const orgCode = "org_123";
    const redirectURL = "https://redirect.example.com";

    const result = await switchOrg({ domain, orgCode, redirectURL });

    expect(generateAuthUrl).toHaveBeenCalledTimes(1);
    expect(generateAuthUrl).toHaveBeenCalledWith(
      domain,
      IssuerRouteTypes.login,
      expect.objectContaining({
        prompt: PromptTypes.none,
        orgCode,
        redirectURL,
      }),
    );

    expect(result.state).toBe("mockstate");
    expect(result.nonce).toBe("mocknonce");
    expect(result.codeChallenge).toBe("mockchallenge");
    expect(result.codeVerifier).toBe("mockverifier");

    const prompt = result.url.searchParams.get("prompt");
    const orgParam = result.url.searchParams.get("org_code");
    const redirectParam = result.url.searchParams.get("redirect_uri");
    expect(prompt).toBe("none");
    expect(orgParam).toBe("org_123");
    expect(redirectParam).toBe("https://redirect.example.com");
  });
});
