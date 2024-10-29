import { getActiveStorage, StorageKeys } from "../main";

export const frameworkSettings: { framework: string; frameworkVersion: string } = {
  framework: "",
  frameworkVersion: "",
};

export const exchangeAuthCode = async ({
  urlParams,
  domain,
  clientId,
  redirectURL,
}: {
  urlParams: URLSearchParams;
  domain: string;
  clientId: string;
  redirectURL: string;
}): Promise<unknown> => {
  const state = urlParams.get("state");
  const code = urlParams.get("code");

  if (!state || !code) {
    console.error("Invalid state or code");
    return {
      success: false,
      error: "Invalid state or code",
    };
  }

  const activeStorage = getActiveStorage();
  if (!activeStorage) {
    throw new Error("No active storage found");
  }
  activeStorage.getSessionItem(StorageKeys.state);

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

  const headers: { 'Content-type': string, "Kinde-SDK"?: string } = {
    "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  }

  if (frameworkSettings.framework) {
    headers["Kinde-SDK"] = `${frameworkSettings.framework}/${frameworkSettings.frameworkVersion}`
  }

  const response = await fetch(`${domain}/oauth2/token`, {
    method: "POST",
    // ...(isUseCookie && {credentials: 'include'}),
    credentials: "include",
    headers,
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectURL,
    }),
  });

  const data: {
    access_token: string;
    id_token: string;
    refresh_token: string;
  } = await response.json();

  activeStorage.setItems({
    [StorageKeys.accessToken]: data.access_token,
    [StorageKeys.idToken]: data.id_token,
    [StorageKeys.refreshToken]: data.refresh_token,
  });

  activeStorage.removeItems(StorageKeys.state, StorageKeys.codeVerifier);

  // Clear all url params
  // const url = new URL(window.location.toString());
  // url.search = "";
  // window.history.pushState({}, "", url);

  return {
    success: true,
    [StorageKeys.accessToken]: data.access_token,
    [StorageKeys.idToken]: data.id_token,
    [StorageKeys.refreshToken]: data.refresh_token,
  };
};