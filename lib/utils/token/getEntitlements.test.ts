import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getEntitlements } from "./getEntitlements";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { clearActiveStorage, setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);

const mockEntitlementsAPIResponse = {
  data: {
    org_code: "org_0195ac80a14e",
    plans: [{ key: "pro_plan", subscribed_on: "2025-06-01T12:00:00Z" }],
    entitlements: [
      {
        id: "entitlement_0195ac80a14e8d71f42b98e75d3c61ad",
        fixed_charge: 35,
        price_name: "Pro gym",
        unit_amount: 1,
        feature_key: "base_price",
        feature_name: "Pro Gym",
        entitlement_limit_max: 1,
        entitlement_limit_min: 1,
      },
    ],
  },
  metadata: {
    has_more: false,
    next_page_starting_after: "entitlement_0195ac80a14e8d71f42b98e75d3c61ad",
  },
};

const mockEntitlementsAPINoPlansAndEntitlementsResponse = {
  data: {
    org_code: "org_0195ac80a14e",
  },
  metadata: {
    has_more: false,
    next_page_starting_after: "entitlement_0195ac80a14e8d71f42b98e75d3c61ad",
  },
};

const expectedResponseNoPlansAndEntitlements = {
  orgCode: "org_0195ac80a14e",
  plans: [],
  entitlements: [],
};

const expectedResponse = {
  orgCode: "org_0195ac80a14e",
  plans: [
    {
      key: "pro_plan",
      subscribedOn: "2025-06-01T12:00:00Z",
    },
  ],
  entitlements: [
    {
      id: "entitlement_0195ac80a14e8d71f42b98e75d3c61ad",
      fixedCharge: 35,
      priceName: "Pro gym",
      unitAmount: 1,
      featureKey: "base_price",
      featureName: "Pro Gym",
      entitlementLimitMax: 1,
      entitlementLimitMin: 1,
    },
  ],
};

const storage: MemoryStorage = new MemoryStorage();
describe("getEntitlements", () => {
  beforeEach(async () => {
    storage.destroySession();
    setActiveStorage(storage);
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken(),
    );
    fetchMock.enableMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns entitlement data on success", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsAPIResponse));
    const result = await getEntitlements();
    expect(result).toEqual(expectedResponse);
  });

  it("returns empty arrays when API response has no plans or entitlements", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify(mockEntitlementsAPINoPlansAndEntitlementsResponse),
    );
    const result = await getEntitlements();
    expect(result).toEqual(expectedResponseNoPlansAndEntitlements);
  });

  it("throws if no domain (iss claim)", async () => {
    vi.doMock("../src/utils/getClaim", () => ({
      getClaim: vi.fn().mockReturnValue(undefined),
    }));
    vi.resetModules();
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({ iss: undefined }),
    );

    await expect(() => getEntitlements()).rejects.toThrow(/Domain/);
  });

  it("throws if no active storage", async () => {
    vi.doMock("../src/utils/getActiveStorage", () => ({
      getActiveStorage: () => undefined,
    }));
    clearActiveStorage();
    await expect(getEntitlements()).rejects.toThrow(/No active storage/);
  });

  it("throws if no token in storage", async () => {
    vi.doMock("../src/utils/getActiveStorage", () => ({
      getActiveStorage: () => ({ get: vi.fn().mockReturnValue(undefined) }),
    }));
    storage.destroySession();
    await expect(getEntitlements()).rejects.toThrow(
      /Authentication token not found/,
    );
  });

  it("throws if fetch fails", async () => {
    fetchMock.mockResponse({
      status: 403,
      statusText: "Forbidden",
      json: vi.fn(),
    });
    // (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(() => getEntitlements()).rejects.toThrow(
      /API request failed with status/,
    );
  });

  // add a test to make sure the correct URL is called
  it("calls the correct URL", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockEntitlementsAPIResponse));
    const fetchSpy = vi.spyOn(global, "fetch");

    await getEntitlements();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://kinde.com/account_api/v1/entitlements",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: `Bearer ${await storage.getSessionItem(StorageKeys.accessToken)}`,
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});
