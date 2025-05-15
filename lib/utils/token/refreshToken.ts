import { getActiveStorage, getInsecureStorage } from ".";
import {
  SessionManager,
  StorageKeys,
  storageSettings,
} from "../../sessionManager";
import { isCustomDomain, sanitizeUrl } from "..";
import { clearRefreshTimer, setRefreshTimer } from "../refreshTimer";
import type { RefreshTokenResult } from "../../main";
import { RefreshType } from "../../main";

/**
 * refreshes the token
 * @returns { Promise<boolean> }
 */
export const refreshToken = async ({
  domain,
  clientId,
  refreshType = RefreshType.refreshToken,
  onRefresh,
}: {
  domain: string;
  clientId: string;
  refreshType?: RefreshType;
  onRefresh?: (data: RefreshTokenResult) => void;
}): Promise<RefreshTokenResult> => {
  const handleResult = (result: RefreshTokenResult) => {
    if (onRefresh) {
      onRefresh(result);
    }
    return result;
  };

  if (!domain) {
    return handleResult({
      success: false,
      error: "Domain is required for token refresh",
    });
  }

  if (!clientId) {
    return handleResult({
      success: false,
      error: "Client ID is required for token refresh",
    });
  }

  let refreshTokenValue: string = "";

  let storage: SessionManager | null;
  if (storageSettings.useInsecureForRefreshToken || !isCustomDomain(domain)) {
    storage = getInsecureStorage();
  } else {
    storage = getActiveStorage();
  }

  if (refreshType === RefreshType.refreshToken) {
    if (!storage) {
      return handleResult({
        success: false,
        error: "No active storage found",
      });
    }

    refreshTokenValue = (await storage.getSessionItem(
      StorageKeys.refreshToken,
    )) as string;

    if (!refreshTokenValue) {
      return handleResult({
        success: false,
        error: "No refresh token found",
      });
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
      }).toString(),
    });
    if (!response.ok) {
      return handleResult({
        success: false,
        error: "Failed to refresh token",
      });
    }
    const data = await response.json();
    if (data.access_token) {
      const secureStore = getActiveStorage();
      if (!secureStore) {
        return handleResult({
          success: false,
          error: "No active storage found",
        });
      }
      setRefreshTimer(data.expires_in, async () => {
        refreshToken({ domain, clientId, refreshType, onRefresh });
      });

      if (storage) {
        await secureStore.setSessionItem(
          StorageKeys.accessToken,
          data.access_token,
        );
        if (data.id_token) {
          await secureStore.setSessionItem(StorageKeys.idToken, data.id_token);
        }
        if (data.refresh_token) {
          await storage.setSessionItem(
            StorageKeys.refreshToken,
            data.refresh_token,
          );
        }
      }
      return handleResult({
        success: true,
        [StorageKeys.accessToken]: data.access_token,
        [StorageKeys.idToken]: data.id_token,
        [StorageKeys.refreshToken]: data.refresh_token,
      });
    }
  } catch (error) {
    return handleResult({
      success: false,
      error: `No access token recieved: ${error}`,
    });
  }

  return handleResult({
    success: false,
    error: `No access token recieved`,
  });
};
