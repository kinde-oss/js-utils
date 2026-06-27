import { describe, it, expect } from "vitest";
import * as index from "./main";
import * as types from "./types";
import * as utils from "./utils";

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

  it("should export sessionManager items used by main", () => {
    const mainSessionManagerExports = [
      "storageSettings",
      "MemoryStorage",
      "ChromeStore",
      "LocalStorage",
      "StorageKeys",
      "SessionBase",
      "TimeoutActivityType",
    ];

    mainSessionManagerExports.forEach((key) => {
      expect(index).toHaveProperty(key);
    });

    expect(index).not.toHaveProperty("ExpoSecureStore");
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
      "base64UrlDecode",
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
      "switchOrg",

      // session manager
      "MemoryStorage",
      "ChromeStore",
      "LocalStorage",
      "storageSettings",

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
