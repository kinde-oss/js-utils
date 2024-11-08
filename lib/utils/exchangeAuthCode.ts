import { getActiveStorage, getInsecureStorage, StorageKeys } from "../main";

export const frameworkSettings: {
  framework: string;
  frameworkVersion: string;
} = {
  framework: "",
  frameworkVersion: "",
};

interface ExchangeAuthCodeParams {
  urlParams: URLSearchParams;
  domain: string;
  clientId: string;
  redirectURL: string;
}

interface ExchangeAuthCodeResult {
  success: boolean;
  error?: string;
  [StorageKeys.accessToken]?: string;
  [StorageKeys.idToken]?: string;
  [StorageKeys.refreshToken]?: string;
}

export const exchangeAuthCode = async ({
  urlParams,
  domain,
  clientId,
  redirectURL,
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

  const headers: {
    "Content-type": string;
    // "Cache-Control": string;
    // Pragma: string;
    "Kinde-SDK"?: string;
  } = {
    "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    // "Cache-Control": "no-store",
    // Pragma: "no-cache",
  };

  if (frameworkSettings.framework) {
    headers["Kinde-SDK"] =
      `${frameworkSettings.framework}/${frameworkSettings.frameworkVersion}`;
  }

  const response = await fetch(`${domain}/oauth2/token`, {
    method: "POST",
    // ...(isUseCookie && {credentials: 'include'}),
    // credentials: "include",
    headers: new Headers(headers),
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectURL,
    }),
  });
  if (!response?.ok) {
    const errorText = await response.text();
    console.error("Token exchange failed:", response.status, errorText);
    return {
      success: false,
      error: `Token exchange failed: ${response.status} - ${errorText}`,
    };
  }

  const data: {
    access_token: string;
    id_token: string;
    refresh_token: string;
  } = await response.json();

  const secureStore = getActiveStorage();
  secureStore!.setItems({
    [StorageKeys.accessToken]: data.access_token,
    [StorageKeys.idToken]: data.id_token,
    [StorageKeys.refreshToken]: data.refresh_token,
  });

  await activeStorage.removeItems(StorageKeys.state, StorageKeys.nonce, StorageKeys.codeVerifier);

  // Clear all url params
  const cleanUrl = (url: URL): URL => {
    url.search = "";
    return url;
  };
  const url = cleanUrl(new URL(window.location.toString()));
  // Replace current state and clear forward history
  window.history.replaceState(window.history.state, "", url);

  return {
    success: true,
    [StorageKeys.accessToken]: data.access_token,
    [StorageKeys.idToken]: data.id_token,
    [StorageKeys.refreshToken]: data.refresh_token,
  };
};
