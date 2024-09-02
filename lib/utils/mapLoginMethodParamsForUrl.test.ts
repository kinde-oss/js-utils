// mapLoginMethodParamsForUrl.test.ts
import { describe, expect, it } from "vitest";
import { mapLoginMethodParamsForUrl } from "./mapLoginMethodParamsForUrl";
import { LoginMethodParams, Scopes } from "../types";

describe("mapLoginMethodParamsForUrl", () => {
  it("should map login method params to URL parameters", () => {
    const options: Partial<LoginMethodParams> = {
      loginHint: "user@example.com",
      isCreateOrg: true,
      connectionId: "conn123",
      redirectURL: "https://example.com",
      audience: "audience123",
      scope: [Scopes.openid, Scopes.profile],
      prompt: "login",
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
    };

    const result = mapLoginMethodParamsForUrl(options);
    expect(result).toEqual(expectedOutput);
  });

  it("should sanitize the redirect URL", () => {
    const options: Partial<LoginMethodParams> = {
      redirectURL: "https://example.com/",
    };

    const expectedOutput = {
      redirect_uri: "https://example.com",
      scope: "email profile openid offline",
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
    };

    const result = mapLoginMethodParamsForUrl(options);
    expect(result).toEqual(expectedOutput);
  });
});
