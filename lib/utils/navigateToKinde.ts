export type PopupOptions = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
};

export const openInPopup = (): boolean => {
  return window.self !== window.top;
};

export type NavigateToKindeOptions = {
  url: string;
  popupOptions?: PopupOptions;
  handleResult?: (result: URLSearchParams) => Promise<void>;
  forcePopup?: boolean;
};

export const navigateToKinde = async ({
  url,
  popupOptions = {},
  handleResult,
  forcePopup = false,
}: NavigateToKindeOptions): Promise<void> => {
  if (openInPopup() || forcePopup) {
    await createPopup({
      url,
      popupOptions,
      handleResult,
    });
  } else {
    document.location = url;
  }
};

export const createPopup = async ({
  url,
  popupOptions = {},
  handleResult,
}: NavigateToKindeOptions): Promise<Window | null> => {
  const {
    width = 500,
    height = 600,
    left = (window.screen.width - width) / 2,
    top = (window.screen.height - height) / 2,
  } = popupOptions;

  const popup = window.open(
    url,
    "kinde_auth_popup",
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no`,
  );

  if (!popup) {
    throw new Error("Popup was blocked by the browser");
  }

  const waitForMessage = () => {
    return new Promise<void>((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        if (event.data && event.data.type === "KINDE_AUTH_RESULT") {
          window.removeEventListener("message", messageHandler);
          const searchParams = new URLSearchParams();
          Object.entries(event.data.result).forEach(([key, value]) => {
            searchParams.append(key, value as string);
          });
          handleResult?.(searchParams).then(() => resolve());
        }
      };
      window.addEventListener("message", messageHandler);
    });
  };

  try {
    await waitForMessage();
  } catch (error) {
    throw new Error("Popup authentication failed: " + error);
  }
  return popup;
};

export const waitForPopupClose = (popup: Window): Promise<void> => {
  return new Promise((resolve) => {
    const checkClosed = () => {
      if (popup.closed) {
        resolve();
      } else {
        setTimeout(checkClosed, 100);
      }
    };
    checkClosed();
  });
};
