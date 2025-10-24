import {
  getActiveStorage,
  getInsecureStorage,
  refreshToken,
  RefreshTokenResult,
  StorageKeys,
  storageSettings,
} from "../main";
import { isCustomDomain } from ".";
import { clearRefreshTimer, setRefreshTimer } from "./refreshTimer";
import { isClient } from "./isClient";

export const frameworkSettings: {
  framework: string;
  frameworkVersion: string;
  sdkVersion: string;
} = {
  framework: "",
  frameworkVersion: "",
  sdkVersion: "",
};

interface ExchangeAuthCodeParams {
  urlParams: URLSearchParams;
  domain: string;
  clientId: string;
  clientSecret?: string;
  redirectURL: string;
  autoRefresh?: boolean;
  onRefresh?: (data: RefreshTokenResult) => void;
}

type ExchangeAuthCodeResultSuccess = {
  success: true;
  error?: never;
  [StorageKeys.accessToken]?: string;
  [StorageKeys.idToken]?: string;
  [StorageKeys.refreshToken]?: string;
};

type ExchangeAuthCodeResultError = {
  success: false;
  error: string;
  [StorageKeys.accessToken]?: never;
  [StorageKeys.idToken]?: never;
  [StorageKeys.refreshToken]?: never;
};

type ExchangeAuthCodeResult =
  | ExchangeAuthCodeResultSuccess
  | ExchangeAuthCodeResultError;

const clearTempStore = async () => {
  const activeStorage = getInsecureStorage();

  await activeStorage?.removeItems(
    StorageKeys.state,
    StorageKeys.nonce,
    StorageKeys.codeVerifier,
  );
};

export const generateKindeSDKHeader = (): string => {
  return `${frameworkSettings.framework}/${frameworkSettings.sdkVersion}/${frameworkSettings.frameworkVersion}/Javascript`;
};

export const exchangeAuthCode = async ({
  urlParams,
  domain,
  clientId,
  clientSecret,
  redirectURL,
  autoRefresh = false,
  onRefresh,
}: ExchangeAuthCodeParams): Promise<ExchangeAuthCodeResult> => {
  const state = urlParams.get("state");
  const code = urlParams.get("code");

  if (!state || !code) {
    console.error("Invalid state or code");
    return {
      success: false,
      error: "Invalid state or code",
    };
  }

  const activeStorage = getInsecureStorage();
  if (!activeStorage) {
    console.error("No active storage found");
    return {
      success: false,
      error: `Authentication storage is not initialized`,
    };
  }

  // warn if framework and version has not been set
  if (!frameworkSettings.framework || !frameworkSettings.frameworkVersion) {
    console.warn(
      "Framework and version not set. Please set the framework and version in the config object",
    );
  }

  const storedState = await activeStorage.getSessionItem(StorageKeys.state);
  if (state !== storedState) {
    console.error("Invalid state");
    return {
      success: false,
      error: `Invalid state; supplied ${state}, expected ${storedState}`,
    };
  }

  const codeVerifier = (await activeStorage.getSessionItem(
    StorageKeys.codeVerifier,
  )) as string;
  if (codeVerifier === null) {
    console.error("Code verifier not found");
    return {
      success: false,
      error: "Code verifier not found",
    };
  }

  const headers: {
    "Content-type": string;
    "Kinde-SDK"?: string;
  } = {
    "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  };

  if (frameworkSettings.framework) {
    headers["Kinde-SDK"] = generateKindeSDKHeader();
  }

  const credentialsHeader: Partial<RequestInit> =
    !storageSettings.useInsecureForRefreshToken && isCustomDomain(domain)
      ? {
          credentials: "include",
        }
      : {};

  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectURL,
  });

  if (clientSecret) {
    body.append("client_secret", clientSecret);
  }

  const fetchOptions: RequestInit = {
    method: "POST",
    ...credentialsHeader,
    headers: new Headers(headers),
    body,
  };

  let response;
  clearRefreshTimer();
  try {
    response = await fetch(`${domain}/oauth2/token`, fetchOptions);
    if (!response?.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", response.status, errorText);
      return {
        success: false,
        error: `Token exchange failed: ${response.status} - ${errorText}`,
      };
    }
  } catch (error) {
    clearTempStore();
    console.error("Token exchange failed:", error);
    return {
      success: false,
      error: `Token exchange failed: ${error}`,
    };
  }

  const data: {
    access_token: string;
    id_token: string;
    refresh_token: string;
    expires_in: number;
  } = await response.json();

  const secureStore = getActiveStorage();
  if (secureStore) {
    try {
      await secureStore.setItems({
        [StorageKeys.accessToken]: data.access_token,
        [StorageKeys.idToken]: data.id_token,
        [StorageKeys.refreshToken]: data.refresh_token,
      });
    } catch (error) {
      console.error("Failed to persist tokens to secure storage:", error);
      return {
        success: false,
        error: `Failed to persist tokens: ${error}`,
      };
    }
  }

  if (storageSettings.useInsecureForRefreshToken || !isCustomDomain(domain)) {
    activeStorage.setSessionItem(StorageKeys.refreshToken, data.refresh_token);
  }

  if (autoRefresh) {
    setRefreshTimer(data.expires_in, async () => {
      refreshToken({ domain, clientId, onRefresh });
    });
  }

  clearTempStore();

  // Clear all url params
  const cleanUrl = (url: URL): URL => {
    url.search = "";
    return url;
  };

  if (isClient()) {
    const url = cleanUrl(new URL(window.location.toString()));
    // Replace current state and clear forward history
    window.history.replaceState(window.history.state, "", url);
  }
  if (!data.access_token || !data.id_token || !data.refresh_token) {
    return {
      success: false,
      error: "No access token received",
    };
  }

  return {
    success: true,
    [StorageKeys.accessToken]: data.access_token,
    [StorageKeys.idToken]: data.id_token,
    [StorageKeys.refreshToken]: data.refresh_token,
  };
};
