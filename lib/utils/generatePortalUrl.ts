import { StorageKeys } from "../sessionManager";
import { GeneratePortalUrlParams, PortalPage, ProfilePage } from "../types";
import { sanitizeUrl } from "./sanitizeUrl";
import { getActiveStorage } from "./token";

/**
 * @deprecated This function is deprecated and will be removed in a future version.
 * Please use `generatePortalUrl` instead.
 */
export const generateProfileUrl = async (params: {
  domain: string;
  returnUrl: string;
  subNav?: ProfilePage;
}): Promise<{
  url: URL;
}> => {
  console.warn(
    "Warning: generateProfileUrl is deprecated. Please use generatePortalUrl instead.",
  );
  return generatePortalUrl({
    domain: params.domain,
    returnUrl: params.returnUrl,
    subNav: params.subNav as unknown as PortalPage,
  });
};
/**
 * Generates a URL to the user profile portal
 *
 * @param {Object} options - Configuration options
 * @param {string} options.domain - The domain of the Kinde instance
 * @param {string} options.returnUrl - URL to redirect to after completing the profile flow
 * @param {PortalPage} options.subNav - Sub-navigation section to display
 * @returns {Promise<{url: URL}>} Object containing the URL to redirect to
 */
export const generatePortalUrl = async ({
  domain,
  returnUrl,
  subNav,
}: GeneratePortalUrlParams): Promise<{
  url: URL;
}> => {
  const activeStorage = getActiveStorage();
  if (!activeStorage) {
    throw new Error("generatePortalUrl: Active storage not found");
  }

  const token = (await activeStorage.getSessionItem(
    StorageKeys.accessToken,
  )) as string;
  if (!token) {
    throw new Error("generatePortalUrl: Access Token not found");
  }

  // Validate that returnUrl is an absolute URL using the URL constructor
  let isAbsoluteUrl = false;
  try {
    const testUrl = new URL(returnUrl);
    isAbsoluteUrl = !!testUrl.protocol && !!testUrl.host;
  } catch {
    isAbsoluteUrl = false;
  }
  if (!isAbsoluteUrl) {
    throw new Error("generatePortalUrl: returnUrl must be an absolute URL");
  }

  const params = new URLSearchParams({
    sub_nav: subNav || PortalPage.profile,
    return_url: returnUrl,
  });

  const fetchResponse = await fetch(
    `${sanitizeUrl(domain)}/account_api/v1/portal_link?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!fetchResponse.ok) {
    throw new Error(
      `Failed to fetch profile URL: ${fetchResponse.status} ${fetchResponse.statusText}`,
    );
  }

  const fetchResult = await fetchResponse.json();
  if (!fetchResult.url || typeof fetchResult.url !== "string") {
    throw new Error("Invalid URL received from API");
  }
  try {
    return {
      url: new URL(fetchResult.url),
    };
  } catch (error) {
    console.error(error);
    throw new Error(`Invalid URL format received from API: ${fetchResult.url}`);
  }
};
