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
import {
  callWithTokenSession,
  createTokenRequestDeadline,
  withTokenSessionLock,
} from "../tokenGeneration";

/**
 * refreshes the token
 * @returns { Promise<RefreshTokenResult> }
 */
export const refreshToken = async ({
  domain,
  clientId,
  clientSecret,
  refreshType = RefreshType.refreshToken,
  onRefresh,
}: {
  domain: string;
  clientId: string;
  clientSecret?: string;
  refreshType?: RefreshType;
  onRefresh?: (data: RefreshTokenResult) => void;
}): Promise<RefreshTokenResult> => {
  const handleResult = (result: RefreshTokenResult) => {
    if (onRefresh) {
      onRefresh(result);
    }
    return result;
  };

  const result = await withTokenSessionLock(
    async (): Promise<RefreshTokenResult> => {
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
      if (
        storageSettings.useInsecureForRefreshToken ||
        !isCustomDomain(domain)
      ) {
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
      let result: RefreshTokenResult;
      let data;
      try {
        // Kept inside the session lock so a slower refresh cannot overwrite a
        // newer session. The handler uses the same deadline as the built-in
        // token request: a timeout releases the lock, and tokens that arrive
        // after it are not stored. callWithTokenSession rejects a handler
        // that acquires this lock again.
        const refreshHandler = storageSettings.onRefreshHandler;
        if (refreshHandler) {
          const deadline = createTokenRequestDeadline();
          try {
            result = await deadline.readBody(() =>
              Promise.resolve(
                callWithTokenSession(() => refreshHandler(refreshType)),
              ),
            );
            deadline.assertWithinDeadline();
          } finally {
            // Cancel the deadline before any token write.
            deadline.settle();
          }
        } else {
          const body = new URLSearchParams({
            ...(refreshType === RefreshType.refreshToken && {
              refresh_token: refreshTokenValue,
            }),
            grant_type: "refresh_token",
            client_id: clientId,
          });
          if (clientSecret) {
            body.append("client_secret", clientSecret);
          }
          const includeCredentials =
            refreshType === RefreshType.cookie ||
            (isCustomDomain(domain) &&
              !storageSettings.useInsecureForRefreshToken);

          const deadline = createTokenRequestDeadline();
          try {
            const response = await deadline.readBody(() =>
              fetch(`${sanitizeUrl(domain)}/oauth2/token`, {
                method: "POST",
                signal: deadline.signal,
                ...(includeCredentials && { credentials: "include" }),
                headers: {
                  "Content-type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                },
                body: body.toString(),
              }),
            );
            if (!response.ok) {
              deadline.assertWithinDeadline();
              return {
                success: false,
                error: "Failed to refresh token",
              };
            }
            data = await deadline.readBody(() => response.json());
            deadline.assertWithinDeadline();
            result = {
              success: true,
              [StorageKeys.accessToken]: data.access_token,
              [StorageKeys.idToken]: data.id_token,
              [StorageKeys.refreshToken]: data.refresh_token,
            };
          } finally {
            // Cancel the deadline before any token write.
            deadline.settle();
          }
        }
        if (result.accessToken) {
          const accessToken = result.accessToken;
          const secureStore = getActiveStorage();
          if (!secureStore) {
            return { success: false, error: "No active storage found" };
          }

          await secureStore.setSessionItem(
            StorageKeys.accessToken,
            accessToken,
          );
          if (result.idToken) {
            await secureStore.setSessionItem(
              StorageKeys.idToken,
              result.idToken,
            );
          }
          if (storage && result.refreshToken) {
            await storage.setSessionItem(
              StorageKeys.refreshToken,
              result.refreshToken,
            );
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
          return result;
        }
      } catch (error) {
        return {
          success: false,
          error: `No access token received: ${error}`,
        };
      }
      return {
        success: false,
        error: `No access token received`,
      };
    },
  );

  return handleResult(result);
};
