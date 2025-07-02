import { describe, it, expect, vi, beforeEach } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { generatePortalUrl, generateProfileUrl } from "./generatePortalUrl";
import { MemoryStorage, StorageKeys } from "../sessionManager";
import { clearActiveStorage, setActiveStorage } from "./token";
import { PortalPage } from "../types";
import { createMockAccessToken } from "./token/testUtils";

const fetchMock = createFetchMock(vi);

describe("generateProfileUrl", () => {
  beforeEach(() => {
    clearActiveStorage();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    vi.restoreAllMocks();
  });

  it("emits a console warning when called", async () => {
    const warnSpy = vi.spyOn(console, "warn");
    const domain = "https://mykindedomain.com";
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");
    fetchMock.mockOnce(
      JSON.stringify({
        url: "http://responseurl",
      }),
    );
    generateProfileUrl({ domain, returnUrl: "http://returnurl.com" });
    expect(warnSpy).toHaveBeenCalledWith(
      "Warning: generateProfileUrl is deprecated. Please use generatePortalUrl instead.",
    );
  });
});

describe("generatePortalUrl", () => {
  beforeEach(() => {
    clearActiveStorage();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
  });

  it("throws error when storage is not set", () => {
    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";

    expect(() =>
      generatePortalUrl({
        domain,
        returnUrl,
      }),
    ).rejects.toThrowError("generatePortalUrl: Active storage not found");
  });

  it("throws error when Access Token is not set", () => {
    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";

    const storage = new MemoryStorage();
    setActiveStorage(storage);

    expect(() =>
      generatePortalUrl({
        domain,
        returnUrl,
      }),
    ).rejects.toThrowError("generatePortalUrl: Access Token not found");
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
    const subNav: PortalPage = PortalPage.organizationMembers;

    const result = await generatePortalUrl({
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

    const result = await generatePortalUrl({
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

    const subNav: PortalPage = PortalPage.organizationPaymentDetails;

    const fetchSpy = vi.spyOn(global, "fetch");
    const domain = "https://mykindedomain.kinde.com/";
    const returnUrl = "http://anotherredirect.com";

    const result = await generatePortalUrl({
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
    const subNav: PortalPage = PortalPage.organizationPlanSelection;

    await generatePortalUrl({
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
    const subNav: PortalPage = PortalPage.organizationPlanDetails;

    await expect(
      generatePortalUrl({
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
    const subNav: PortalPage = PortalPage.profile;

    await expect(
      generatePortalUrl({
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
    const subNav: PortalPage = PortalPage.profile;

    await expect(
      generatePortalUrl({
        domain,
        returnUrl,
        subNav,
      }),
    ).rejects.toThrow("Failed to fetch profile URL: 500");
  });

  it("Handles when the returnUrl is not absolute", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockOnce(
      JSON.stringify({
        url: "/tst",
      }),
    );

    const domain = "https://mykindedomain.com";
    const returnUrl = "somereturnurl.com";
    const subNav: PortalPage = PortalPage.profile;

    await expect(
      generatePortalUrl({
        domain,
        returnUrl,
        subNav,
      }),
    ).rejects.toThrow("generatePortalUrl: returnUrl must be an absolute URL");
  });

  it("Handles expo returnUrl", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockOnce(
      JSON.stringify({
        url: "http://responseurl",
      }),
    );

    const domain = "https://mykindedomain.com";
    const returnUrl = "http://192.168.68.61";
    const subNav: PortalPage = PortalPage.profile;

    const fetchSpy = vi.spyOn(global, "fetch");

    await generatePortalUrl({
      domain,
      returnUrl,
      subNav,
    });
    expect(fetchSpy).toBeCalled();
    expect(fetchSpy).toBeCalledWith(
      expect.stringContaining(`sub_nav=${subNav}`),
      expect.any(Object),
    );
  });

  it("Handles custom schema returnUrl", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(StorageKeys.accessToken, "storedAccessToken");

    fetchMock.mockOnce(
      JSON.stringify({
        url: "http://responseurl",
      }),
    );

    const domain = "https://mykindedomain.com";
    const returnUrl = "somecustomschema://192.168.68.61:8081";
    const subNav: PortalPage = PortalPage.profile;

    const fetchSpy = vi.spyOn(global, "fetch");

    await generatePortalUrl({
      domain,
      returnUrl,
      subNav,
    });

    expect(fetchSpy).toBeCalledWith(
      expect.stringContaining(`sub_nav=${subNav}`),
      expect.any(Object),
    );
  });

  it("Obtain the domain from token when not defined", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        iss: "https://mykindedomain.com",
      }),
    );

    fetchMock.mockOnce(
      JSON.stringify({
        url: "http://responseurl",
      }),
    );

    const returnUrl = "somecustomschema://192.168.68.61:8081";
    const subNav: PortalPage = PortalPage.profile;

    const fetchSpy = vi.spyOn(global, "fetch");

    await generatePortalUrl({
      returnUrl,
      subNav,
    });

    expect(fetchSpy).toBeCalledWith(
      expect.stringMatching(`^https://mykindedomain.com`),
      expect.any(Object),
    );
  });

  it("Throws error when iss is missing", async () => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    await storage.setSessionItem(
      StorageKeys.accessToken,
      createMockAccessToken({
        iss: undefined,
      }),
    );

    fetchMock.mockOnce(
      JSON.stringify({
        url: "http://responseurl",
      }),
    );

    const returnUrl = "somecustomschema://192.168.68.61:8081";
    const subNav: PortalPage = PortalPage.profile;

    expect(() =>
      generatePortalUrl({
        returnUrl,
        subNav,
      }),
    ).rejects.toThrowError(
      "generatePortalUrl: Unable to determine domain from access token",
    );
  });
});
