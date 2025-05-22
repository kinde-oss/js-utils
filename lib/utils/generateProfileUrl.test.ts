import { describe, it, expect, vi, beforeEach } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { generateProfileUrl } from "./generateProfileUrl";
import { OrgCode } from "../types";
import { MemoryStorage, StorageKeys } from "../sessionManager";
import { clearActiveStorage, setActiveStorage } from "./token";
const fetchMock = createFetchMock(vi);

describe("generateProfileUrl", () => {
  beforeEach(() => {
    clearActiveStorage();
    fetchMock.enableMocks();
  });

  it("throws error when storage is not set", () => {
    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";
    const orgCode: OrgCode = "org_test";
    const subNav: string = "subnavvalue";

    expect(() =>
      generateProfileUrl({
        domain,
        orgCode,
        returnUrl,
        subNav,
      }),
    ).rejects.toThrowError("generateProfileUrl: Active storage not found");
  });

  it("throws error when Access Token is not set", () => {
    const domain = "https://mykindedomain.com";
    const returnUrl = "http://somereturnurl.com";
    const orgCode: OrgCode = "org_test";
    const subNav: string = "subnavvalue";

    const storage = new MemoryStorage();
    setActiveStorage(storage);

    expect(() =>
      generateProfileUrl({
        domain,
        orgCode,
        returnUrl,
        subNav,
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
    const orgCode: OrgCode = "org_test";
    const subNav: string = "subnavvalue";

    const result = await generateProfileUrl({
      domain,
      orgCode,
      returnUrl,
      subNav,
    });

    expect(fetchSpy).toBeCalledWith(
      `https://mykindedomain.com/frontend_api/get_portal_link?return_url=http%3A%2F%2Fsomereturnurl.com&org_code=${orgCode}&sub_nav=${subNav}`,
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

    const orgCode: OrgCode = "org_test2";
    const subNav: string = "subnavvalue2";

    const fetchSpy = vi.spyOn(global, "fetch");
    const domain = "https://mykindedomain.kinde.com/";
    const returnUrl = "http://anotherredirect.com";

    const result = await generateProfileUrl({
      domain,
      orgCode,
      returnUrl,
      subNav,
    });

    expect(fetchSpy).toBeCalledWith(
      `https://mykindedomain.kinde.com/frontend_api/get_portal_link?return_url=http%3A%2F%2Fanotherredirect.com&org_code=${orgCode}&sub_nav=${subNav}`,
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
    const orgCode: OrgCode = "org_test&special";
    const subNav: string = "subnav/value+special";

    await generateProfileUrl({
      domain,
      orgCode,
      returnUrl,
      subNav,
    });

    expect(fetchSpy).toBeCalledWith(
      expect.stringContaining(`return_url=${encodeURIComponent(returnUrl)}`),
      expect.any(Object),
    );
    expect(fetchSpy).toBeCalledWith(
      expect.stringContaining(`org_code=${orgCode}`),
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
    const orgCode: OrgCode = "org_test";
    const subNav: string = "subnavvalue";

    await expect(
      generateProfileUrl({
        domain,
        orgCode,
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
    const orgCode: OrgCode = "org_test";
    const subNav: string = "subnavvalue";

    await expect(
      generateProfileUrl({
        domain,
        orgCode,
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
    const orgCode: OrgCode = "org_test";
    const subNav: string = "subnavvalue";

    await expect(
      generateProfileUrl({
        domain,
        orgCode,
        returnUrl,
        subNav,
      }),
    ).rejects.toThrow("Failed to fetch profile URL: 500");
  });
});
