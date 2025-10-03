import { getActiveStorage, getClaim, getInsecureStorage } from ".";
import {
  SessionManager,
  StorageKeys,
  storageSettings,
} from "../../sessionManager";
import { isCustomDomain, sanitizeUrl } from "..";
import { clearRefreshTimer, setRefreshTimer } from "../refreshTimer";
import type { RefreshTokenResult } from "../../main";
import { RefreshType } from "../../main";
import { isClient } from "../isClient";

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
  let result: RefreshTokenResult;
  let data;
  try {
    if (storageSettings.onRefreshHandler) {
      result = await storageSettings.onRefreshHandler(refreshType);
    } else {
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
      data = await response.json();
      result = {
        success: true,
        [StorageKeys.accessToken]: data.access_token,
        [StorageKeys.idToken]: data.id_token,
        [StorageKeys.refreshToken]: data.refresh_token,
      };
    }
    if (result.accessToken) {
      const secureStore = getActiveStorage();
      if (!secureStore) {
        return handleResult({
          success: false,
          error: "No active storage found",
        });
      }

      await secureStore.setSessionItem(
        StorageKeys.accessToken,
        result.accessToken,
      );
      if (result.idToken) {
        await secureStore.setSessionItem(StorageKeys.idToken, result.idToken);
      }
      if (storage) {
        if (result.refreshToken) {
          await storage.setSessionItem(
            StorageKeys.refreshToken,
            result.refreshToken,
          );
        }
      }

      if (isClient()) {
        const exp = Number((await getClaim("exp"))?.value);
        if (Number.isFinite(exp) || data?.expires_in) {
          let secsToExpiry = 0;
          if (!data?.expires_in) {
            const nowSec = Math.floor(Date.now() / 1000);
            secsToExpiry = Math.max(exp - nowSec, 1);
          }
          setRefreshTimer(data?.expires_in || secsToExpiry, async () => {
            refreshToken({ domain, clientId, refreshType, onRefresh });
          });
        }
      }
      return handleResult(result);
    }
  } catch (error) {
    return handleResult({
      success: false,
      error: `No access token received: ${error}`,
    });
  }

  return handleResult({
    success: false,
    error: `No access token received`,
  });
};
