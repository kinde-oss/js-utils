import { getActiveStorage } from ".";
import { StorageKeys } from "../../sessionManager";
import { sanitizeUrl } from "..";
import { clearRefreshTimer, setRefreshTimer } from "../refreshTimer";

/**
 * refreshes the token
 * @returns { Promise<boolean> }
 */
export const refreshToken = async (
  domain: string,
  clientId: string,
): Promise<boolean> => {
  try {
    if (!domain) {
      console.error("Domain is required for token refresh");
      return false;
    }

    if (!clientId) {
      console.error("Client ID is required for token refresh");
      return false;
    }

    const storage = await getActiveStorage();

    if (!storage) {
      console.error("No active storage found");
      return false;
    }

    const refreshTokenValue = (await storage.getSessionItem(
      StorageKeys.refreshToken,
    )) as string;

    if (!refreshTokenValue) {
      console.error("No refresh token found");
      return false;
    }

    clearRefreshTimer();

    const response = await fetch(`${sanitizeUrl(domain)}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
      body:  new URLSearchParams({
        refresh_token: refreshTokenValue,
        grant_type: "refresh_token",
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token");
      return false;
    }

    const data = await response.json();

    if (data.access_token) {
      setRefreshTimer(data.expires_in * 1000, async () => {
        refreshToken(domain, clientId);
      });
      await storage.setSessionItem(StorageKeys.accessToken, data.access_token);
      if (data.id_token) {
        await storage.setSessionItem(StorageKeys.idToken, data.id_token);
      }
      if (data.refresh_token) {
        await storage.setSessionItem(
          StorageKeys.refreshToken,
          data.refresh_token,
        );
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
};
