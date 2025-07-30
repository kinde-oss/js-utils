/**
 * Configuration options for popup window dimensions and position.
 */
export type PopupOptions = {
  /** Width of the popup window in pixels (default: 500) */
  width?: number;
  /** Height of the popup window in pixels (default: 600) */
  height?: number;
  /** Left position of the popup window in pixels (default: centered) */
  left?: number;
  /** Top position of the popup window in pixels (default: centered) */
  top?: number;
};

/**
 * Checks if the current window is running inside a popup.
 *
 * @returns True if the current window is a popup (self !== top), false otherwise
 */
export const openInPopup = (): boolean => {
  return window.self !== window.top;
};

/**
 * Configuration options for navigating to Kinde authentication.
 */
export type NavigateToKindeOptions = {
  /** The URL to navigate to for authentication */
  url: string;
  /** Optional popup window configuration */
  popupOptions?: PopupOptions;
  /** Optional callback to handle authentication results */
  handleResult?: (result: URLSearchParams) => Promise<void>;
  /** Force popup window (default: false) */
  forcePopup?: boolean;
};

/**
 * Navigates to Kinde authentication URL, either in a popup or by redirecting the current page.
 *
 * This function determines whether to open the authentication URL in a popup window
 * or redirect the current page based on the current context and options provided.
 * If the current window is in an iFrame a popup or forcePopup is true, it will create
 * a new popup window. Otherwise, it redirects the current page.
 *
 * @param options - Configuration options for the navigation
 * @returns A promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * // Navigate to authentication in popup
 * await navigateToKinde({
 *   url: "https://app.kinde.com/oauth/authorize?client_id=...",
 *   popupOptions: { width: 600, height: 700 },
 *   handleResult: async (result) => {
 *     console.log("Auth result:", result);
 *     // Handle authentication result
 *   },
 *   forcePopup: true
 * });
 *
 * // Navigate by redirecting current page
 * await navigateToKinde({
 *   url: "https://app.kinde.com/oauth/authorize?client_id=...",
 *   handleResult: async (result) => {
 *     // This will only be called if in popup mode on completion
 *   }
 * });
 * ```
 */
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

/**
 * Creates a popup window for Kinde authentication and waits for the result.
 *
 * This function opens a popup window with the specified URL and waits for
 * a message from the popup containing authentication results. The popup
 * window is configured with the provided options and positioned on screen.
 *
 * @param options - Configuration options for the popup
 * @returns A promise that resolves with the popup window reference, or null if blocked
 * @throws {Error} When the popup is blocked by the browser
 * @throws {Error} When authentication fails
 *
 * @example
 * ```typescript
 * const popup = await createPopup({
 *   url: "https://app.kinde.com/oauth/authorize?client_id=...",
 *   popupOptions: {
 *     width: 600,
 *     height: 700,
 *     left: 100,
 *     top: 100
 *   },
 *   handleResult: async (result) => {
 *     console.log("Authentication completed:", result);
 *   }
 * });
 * ```
 */
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

/**
 * Waits for a popup window to close by polling its closed state.
 *
 * This function creates a promise that resolves when the specified popup window
 * is closed. It polls the popup's closed property every 100ms until the window
 * is no longer open.
 *
 * @param popup - The popup window to monitor
 * @returns A promise that resolves when the popup is closed
 *
 * @example
 * ```typescript
 * const popup = await createPopup({ url: "https://example.com" });
 *
 * // Wait for popup to close
 * await waitForPopupClose(popup);
 * console.log("Popup has been closed");
 * ```
 */
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
