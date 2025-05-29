import { describe, it, expect, vi, beforeEach } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { generateProfileUrl } from "./generateProfileUrl";
import { MemoryStorage, StorageKeys } from "../sessionManager";
import { clearActiveStorage, setActiveStorage } from "./token";
import { ProfilePage } from "../types";
const fetchMock = createFetchMock(vi);

describe("generateProfileUrl", () => {
  beforeEach(() => {
    clearActiveStorage();
    fetchMock.enableMocks();
  });

  it("throws error when storage is not set", () => {
    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";

    expect(() =>
      generateProfileUrl({
        domain,
        returnUrl,
      }),
    ).rejects.toThrowError("generateProfileUrl: Active storage not found");
  });

  it("throws error when Access Token is not set", () => {
    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";

    const storage = new MemoryStorage();
    setActiveStorage(storage);

    expect(() =>
      generateProfileUrl({
        domain,
        returnUrl,
      }),
    ).rejects.toThrowError("generateProfileUrl: Access Token not found");
  });

  it("requests the URL correctly", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockOnce(
      JSON.stringify({
        url: "http://responseurl",
      }),
    );
    const fetchSpy = vi.spyOn(global, "fetch");

    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";
    const subNav: ProfilePage = ProfilePage.organizationMembers;

    const result = await generateProfileUrl({
      domain,
      returnUrl,
      subNav,
    });

    expect(fetchSpy).toBeCalledWith(
      `https://mykindedomain.com/account_api/v1/portal_link?sub_nav=organization_members&return_url=http%3A%2F%2Fsomereturnurl.com`,
      {
        headers: {
          Authorization: "Bearer storedAccessToken",
        },
      },
    );
    expect(result.url.toString()).toBe("http://responseurl/");
  });

  it("requests the URL correctly - missing subnav", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockOnce(
      JSON.stringify({
        url: "http://responseurl",
      }),
    );
    const fetchSpy = vi.spyOn(global, "fetch");

    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";

    const result = await generateProfileUrl({
      domain,
      returnUrl,
    });

    expect(fetchSpy).toBeCalledWith(
      `https://mykindedomain.com/account_api/v1/portal_link?sub_nav=profile&return_url=http%3A%2F%2Fsomereturnurl.com`,
      {
        headers: {
          Authorization: "Bearer storedAccessToken",
        },
      },
    );
    expect(result.url.toString()).toBe("http://responseurl/");
  });

  it("requests the URL correctly - with slash in domain", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockOnce(
      JSON.stringify({
        url: "http://someresponse",
      }),
    );

    const subNav: ProfilePage = ProfilePage.organizationPaymentDetails;

    const fetchSpy = vi.spyOn(global, "fetch");
    const domain = "https://mykindedomain.kinde.com/";
    const returnUrl = "http://anotherredirect.com";

    const result = await generateProfileUrl({
      domain,
      returnUrl,
      subNav,
    });

    expect(fetchSpy).toBeCalledWith(
      `https://mykindedomain.kinde.com/account_api/v1/portal_link?sub_nav=organization_payment_details&return_url=http%3A%2F%2Fanotherredirect.com`,
      {
        headers: {
          Authorization: "Bearer storedAccessToken",
        },
      },
    );
    expect(result.url.toString()).toBe("http://someresponse/");
  });

  it("properly encodes URL-unsafe characters in parameters", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockOnce(
      JSON.stringify({
        url: "http://responseurl",
      }),
    );

    const fetchSpy = vi.spyOn(global, "fetch");

    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com?param=value with spaces";
    const subNav: ProfilePage = ProfilePage.organizationPlanSelection;

    await generateProfileUrl({
      domain,
      returnUrl,
      subNav,
    });

    expect(fetchSpy).toBeCalledWith(
      expect.stringContaining(
        `return_url=http%3A%2F%2Fsomereturnurl.com%3Fparam%3Dvalue+with+spaces`,
      ),
      expect.any(Object),
    );
    expect(fetchSpy).toBeCalledWith(
      expect.stringContaining(`sub_nav=${subNav}`),
      expect.any(Object),
    );
  });

  it("handles missing url from API response correctly", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockOnce(
      JSON.stringify({
        /* url field missing */
      }),
    );

    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";
    const subNav: ProfilePage = ProfilePage.organizationPlanDetails;

    await expect(
      generateProfileUrl({
        domain,
        returnUrl,
        subNav,
      }),
    ).rejects.toThrow("Invalid URL received from API");
  });

  it("handles invalid url from API response correctly", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockOnce(
      JSON.stringify({
        url: "/tst",
      }),
    );

    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";
    const subNav: ProfilePage = ProfilePage.profile;

    await expect(
      generateProfileUrl({
        domain,
        returnUrl,
        subNav,
      }),
    ).rejects.toThrow("Invalid URL format received from API: /tst");
  });

  it("handles fetch errors correctly", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockResponseOnce("", { status: 500 });

    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";
    const subNav: ProfilePage = ProfilePage.profile;

    await expect(
      generateProfileUrl({
        domain,
        returnUrl,
        subNav,
      }),
    ).rejects.toThrow("Failed to fetch profile URL: 500");
  });
});
