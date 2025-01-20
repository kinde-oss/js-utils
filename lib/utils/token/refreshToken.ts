import { getActiveStorage, getInsecureStorage } from ".";
import {
  SessionManager,
  StorageKeys,
  storageSettings,
} from "../../sessionManager";
import { sanitizeUrl } from "..";
import { clearRefreshTimer, setRefreshTimer } from "../refreshTimer";

export interface RefreshTokenResult {
  success: boolean;
  error?: string;
  [StorageKeys.accessToken]?: string;
  [StorageKeys.idToken]?: string;
  [StorageKeys.refreshToken]?: string;
}

export enum RefreshType {
  refreshToken,
  cookie,
}

/**
 * refreshes the token
 * @returns { Promise<boolean> }
 */
export const refreshToken = async ({
  domain,
  clientId,
  refreshType = RefreshType.refreshToken,
}: {
  domain: string;
  clientId: string;
  refreshType?: RefreshType;
}): Promise<RefreshTokenResult> => {
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

    let refreshTokenValue: string = "";

    let storage: SessionManager | null;
    if (storageSettings.useInsecureForRefreshToken) {
      storage = getInsecureStorage();
    } else {
      storage = getActiveStorage();
    }

    if (refreshType === RefreshType.refreshToken) {
      if (!storage) {
        return {
          success: false,
          error: "No active storage found",
        };
      }

      refreshTokenValue = (await storage.getSessionItem(
        StorageKeys.refreshToken,
      )) as string;

      if (!refreshTokenValue) {
        return {
          success: false,
          error: "No refresh token found",
        };
      }
    }

    clearRefreshTimer();

    try {
      const response = await fetch(`${sanitizeUrl(domain)}/oauth2/token`, {
        method: "POST",
        ...(refreshType === RefreshType.cookie && { credentials: "include" }),
        headers: {
          "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: new URLSearchParams({
          ...(refreshType === RefreshType.refreshToken && {
            refresh_token: refreshTokenValue,
          }),
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
          refreshToken({ domain, clientId });
        });

        if (storage) {
          await storage.setSessionItem(
            StorageKeys.accessToken,
            data.access_token,
          );
          if (data.id_token) {
            await storage.setSessionItem(StorageKeys.idToken, data.id_token);
          }
          if (data.refresh_token) {
            await storage.setSessionItem(
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
    } catch (error) {
      return {
        success: false,
        error: `No access token recieved: ${error}`,
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
