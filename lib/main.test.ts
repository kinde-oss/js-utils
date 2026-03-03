import { describe, it, expect } from "vitest";
import * as index from "./main";
import * as types from "./types";
import * as utils from "./utils";
import * as sessionManager from "./sessionManager";

describe("index exports", () => {
  it("should export everything from types", () => {
    Object.keys(types).forEach((key) => {
      expect(index).toHaveProperty(key);
    });
  });

  it("should export everything from utils", () => {
    Object.keys(utils).forEach((key) => {
      expect(index).toHaveProperty(key);
    });
  });

  it("should export everything from sessionManager", () => {
    Object.keys(sessionManager).forEach((key) => {
      expect(index).toHaveProperty(key);
    });
  });

  it("should not export anything extra", () => {
    const actualExports = Object.keys(index);

    const expectedExports = [
      // types
      "IssuerRouteTypes",
      "PromptTypes",
      "Scopes",
      "StorageKeys",
      "RefreshType",
      "PortalPage",
      "SessionBase",
      "ProfilePage",
      "TimeoutActivityType",

      // utils
      "base64UrlEncode",
      "extractAuthResults",
      "generateAuthUrl",
      "generatePortalUrl",
      "generateProfileUrl",
      "generateRandomString",
      "mapLoginMethodParamsForUrl",
      "sanitizeUrl",
      "exchangeAuthCode",
      "isAuthenticated",
      "isTokenExpired",
      "refreshToken",
      "checkAuth",
      "isCustomDomain",
      "setRefreshTimer",
      "clearRefreshTimer",
      "splitString",
      "generateKindeSDKHeader",
      "navigateToKinde",
      "updateActivityTimestamp",
      "sessionManagerActivityProxy",
      "isClient",
      "isServer",

      // session manager
      "MemoryStorage",
      "ChromeStore",
      "LocalStorage",
      "storageSettings",
      "ExpoSecureStore",
      "ExpressStore",

      // token utils
      "getActiveStorage",
      "has",
      "hasPermissions",
      "hasRoles",
      "hasFeatureFlags",
      "hasBillingEntitlements",
      "hasActiveStorage",
      "clearActiveStorage",
      "clearInsecureStorage",
      "getInsecureStorage",
      "hasInsecureStorage",
      "setInsecureStorage",
      "getClaim",
      "getClaimSync",
      "getClaims",
      "getClaimsSync",
      "getCurrentOrganization",
      "getCurrentOrganizationSync",
      "getDecodedToken",
      "getDecodedTokenSync",
      "getEntitlements",
      "getEntitlement",
      "getRawToken",
      "getRawTokenSync",
      "getFlag",
      "getFlagSync",
      "getPermission",
      "getPermissionSync",
      "getPermissions",
      "getPermissionsSync",
      "getRoles",
      "getRolesSync",
      "getUserOrganizations",
      "getUserOrganizationsSync",
      "getUserProfile",
      "getUserProfileSync",
      "setActiveStorage",

      // config
      "frameworkSettings",
    ];

    expect(actualExports.sort()).toEqual(expectedExports.sort());
  });
});
