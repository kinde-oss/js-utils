import { StorageKeys } from "../sessionManager";
import { sanitizeUrl } from "./sanitizeUrl";
import { getActiveStorage } from "./token";

/**
 * Generates a URL to the user profile portal
 *
 * @param {Object} options - Configuration options
 * @param {string} options.domain - The domain of the Kinde instance
 * @param {string} options.returnUrl - URL to redirect to after completing the profile flow
 * @param {string} options.subNav - Sub-navigation section to display
 * @returns {Promise<{url: URL}>} Object containing the URL to redirect to
 */
export const generateProfileUrl = async ({
  domain,
  returnUrl,
  subNav,
}: {
  domain: string;
  returnUrl: string;
  subNav: string;
}): Promise<{
  url: URL;
}> => {
  const activeStorage = getActiveStorage();
  if (!activeStorage) {
    throw new Error("generateProfileUrl: Active storage not found");
  }

  const token = (await activeStorage.getSessionItem(
    StorageKeys.accessToken,
  )) as string;
  if (!token) {
    throw new Error("generateProfileUrl: Access Token not found");
  }

  const fetchResponse = await fetch(
    `${sanitizeUrl(domain)}/account_api/v1/portal_link?return_url=${encodeURIComponent(returnUrl)}&sub_nav=${subNav}`,
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
