// mapLoginMethodParamsForUrl.test.ts
import { describe, expect, it } from "vitest";
import { mapLoginMethodParamsForUrl } from "./mapLoginMethodParamsForUrl";
import { LoginMethodParams, PromptTypes, Scopes } from "../types";

describe("mapLoginMethodParamsForUrl", () => {
  it("should map login method params to URL parameters", () => {
    const options: Partial<LoginMethodParams> = {
      loginHint: "user@example.com",
      isCreateOrg: true,
      connectionId: "conn123",
      redirectURL: "https://example.com",
      audience: "audience123",
      scope: [Scopes.openid, Scopes.profile],
      prompt: PromptTypes.login,
      lang: "en",
      orgCode: "org123",
      orgName: "Example Org",
      hasSuccessPage: true,
    };

    const expectedOutput = {
      login_hint: "user@example.com",
      is_create_org: "true",
      connection_id: "conn123",
      redirect_uri: "https://example.com",
      audience: "audience123",
      scope: "openid profile",
      prompt: "login",
      lang: "en",
      org_code: "org123",
      org_name: "Example Org",
      has_success_page: "true",
    };

    const result = mapLoginMethodParamsForUrl(options);
    expect(result).toEqual(expectedOutput);
  });

  it("should handle missing optional parameters", () => {
    const options: Partial<LoginMethodParams> = {
      loginHint: "user@example.com",
      scope: [Scopes.openid],
    };

    const expectedOutput = {
      login_hint: "user@example.com",
      scope: "openid",
      audience: "",
    };

    const result = mapLoginMethodParamsForUrl(options);
    expect(result).toEqual(expectedOutput);
  });

  it("should use default scope if not provided", () => {
    const options: Partial<LoginMethodParams> = {
      loginHint: "user@example.com",
    };

    const expectedOutput = {
      login_hint: "user@example.com",
      scope: "email profile openid offline",
      audience: "",
    };

    const result = mapLoginMethodParamsForUrl(options);
    expect(result).toEqual(expectedOutput);
  });

  it("should map with supports_reauth", () => {
    const options: Partial<LoginMethodParams> = {
      supportsReauth: true,
    };

    const expectedOutput = {
      scope: "email profile openid offline",
      audience: "",
      supports_reauth: "true",
    };

    const result = mapLoginMethodParamsForUrl(options);
    console.log(result);
    expect(result).toEqual(expectedOutput);
  });

  it("should sanitize the redirect URL", () => {
    const options: Partial<LoginMethodParams> = {
      redirectURL: "https://example.com/",
    };

    const expectedOutput = {
      redirect_uri: "https://example.com",
      scope: "email profile openid offline",
      audience: "",
    };

    const result = mapLoginMethodParamsForUrl(options);
    expect(result).toEqual(expectedOutput);
  });

  it("should handle boolean values correctly", () => {
    const options: Partial<LoginMethodParams> = {
      isCreateOrg: false,
      hasSuccessPage: false,
    };

    const expectedOutput = {
      is_create_org: "false",
      has_success_page: "false",
      scope: "email profile openid offline",
      audience: "",
    };

    const result = mapLoginMethodParamsForUrl(options);
    expect(result).toEqual(expectedOutput);
  });

  it("should remove undefined values", () => {
    const options: Partial<LoginMethodParams> = {
      loginHint: undefined,
      isCreateOrg: undefined,
      connectionId: undefined,
      redirectURL: undefined,
      audience: undefined,
      scope: undefined,
      prompt: undefined,
      lang: undefined,
      orgCode: undefined,
      orgName: undefined,
      hasSuccessPage: undefined,
    };

    const expectedOutput = {
      scope: "email profile openid offline",
      audience: "",
    };

    const result = mapLoginMethodParamsForUrl(options);
    expect(result).toEqual(expectedOutput);
  });

  it("should map acrValues and maxAge, including maxAge 0", () => {
    const result = mapLoginMethodParamsForUrl({
      acrValues: "mfa",
      maxAge: 0,
    });

    expect(result.acr_values).toBe("mfa");
    expect(result.max_age).toBe("0");
  });

  it("should space-join an acrValues list", () => {
    const result = mapLoginMethodParamsForUrl({
      acrValues: ["mfa", "phr"],
    });

    expect(result.acr_values).toBe("mfa phr");
  });

  it("should omit acr_values and max_age when they are unset", () => {
    const result = mapLoginMethodParamsForUrl({
      acrValues: undefined,
      maxAge: undefined,
    });

    expect(result).not.toHaveProperty("acr_values");
    expect(result).not.toHaveProperty("max_age");
    expect(JSON.stringify(result)).not.toMatch(/undefined|null|NaN/);
  });

  it("should omit a null maxAge", () => {
    const result = mapLoginMethodParamsForUrl({
      maxAge: null as unknown as number,
    });

    expect(result).not.toHaveProperty("max_age");
  });

  it("should throw before mapping a negative or non-integer maxAge", () => {
    expect(() => mapLoginMethodParamsForUrl({ maxAge: -1 })).toThrow(
      /non-negative integer/,
    );
    expect(() => mapLoginMethodParamsForUrl({ maxAge: 1.5 })).toThrow(
      /non-negative integer/,
    );
    expect(() => mapLoginMethodParamsForUrl({ maxAge: Number.NaN })).toThrow(
      /non-negative integer/,
    );
  });

  it("should map with invitation code", () => {
    const options: Partial<LoginMethodParams> = {
      invitationCode: "invitation123",
    };

    const expectedOutput = {
      invitation_code: "invitation123",
      is_invitation: "true",
      scope: "email profile openid offline",
      audience: "",
    };

    const result = mapLoginMethodParamsForUrl(options);
    expect(result).toEqual(expectedOutput);
  });
});
