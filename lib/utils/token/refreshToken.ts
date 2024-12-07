import { getActiveStorage, getInsecureStorage } from ".";
import { StorageKeys, storageSettings } from "../../sessionManager";
import { sanitizeUrl } from "..";
import { clearRefreshTimer, setRefreshTimer } from "../refreshTimer";

interface RefreshTokenResult {
  success: boolean;
  error?: string;
  [StorageKeys.accessToken]?: string;
  [StorageKeys.idToken]?: string;
  [StorageKeys.refreshToken]?: string;
}

/**
 * refreshes the token
 * @returns { Promise<boolean> }
 */
export const refreshToken = async (
  domain: string,
  clientId: string,
): Promise<RefreshTokenResult> => {
  try {
    if (!domain) {
      return {
        success: false,
        error: "Domain is required for token refresh",
      };
    }

    if (!clientId) {
      return {
        success: false,
        error: "Client ID is required for token refresh",
      };
    }

    const storage = getActiveStorage();
    const insecureStore = getInsecureStorage();

    if (!storage) {
      return {
        success: false,
        error: "No active storage found",
      };
    }

    if (!insecureStore) {
      return {
        success: false,
        error: "No active insecure found",
      };
    }

    const refreshTokenValue = storageSettings.useInsecureForRefreshToken
      ? ((await insecureStore.getSessionItem(
          StorageKeys.refreshToken,
        )) as string)
      : ((await storage.getSessionItem(StorageKeys.refreshToken)) as string);

    if (!refreshTokenValue) {
      return {
        success: false,
        error: "No refresh token found",
      };
    }

    clearRefreshTimer();

    const response = await fetch(`${sanitizeUrl(domain)}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
      body: new URLSearchParams({
        refresh_token: refreshTokenValue,
        grant_type: "refresh_token",
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Failed to refresh token",
      };
    }

    const data = await response.json();

    if (data.access_token) {
      setRefreshTimer(data.expires_in, async () => {
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

        if (storageSettings.useInsecureForRefreshToken) {
          insecureStore.setSessionItem(
            StorageKeys.refreshToken,
            data.refresh_token,
          );
        }
      }
      return {
        success: true,
        [StorageKeys.accessToken]: data.access_token,
        [StorageKeys.idToken]: data.id_token,
        [StorageKeys.refreshToken]: data.refresh_token,
      };
    }

    return {
      success: false,
      error: `No access token recieved`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error refreshing token: ${error}`,
    };
  }
};
