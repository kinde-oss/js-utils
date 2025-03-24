import * as RefreshTimer from "./refreshTimer";
import { beforeAll, describe, expect, it, vi } from "vitest";

describe("refreshTimer", () => {
  beforeAll(() => {
    vi.spyOn(window, "setTimeout");
    vi.spyOn(window, "clearTimeout");
    vi.spyOn(RefreshTimer, "clearRefreshTimer");
  });

  it("set timer and not call callback instantly", () => {
    const callback = vi.fn();
    RefreshTimer.setRefreshTimer(10, callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it("max refresh timer of 1 day", () => {
    const callback = vi.fn();
    const setTimeout = vi.spyOn(window, "setTimeout");
    RefreshTimer.setRefreshTimer(10000000000, callback);
    expect(setTimeout).toBeCalledWith(callback, 86400000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("error when timeout is negative", () => {
    const callback = vi.fn();
    expect(() => RefreshTimer.setRefreshTimer(-10, callback)).toThrowError(
      "Timer duration must be positive",
    );
  });

  it("should throw error when window is undefined", () => {
    const originalWindow = global.window;
    // Temporarily delete the window object
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete global.window;

    const callback = vi.fn();
    expect(() => RefreshTimer.setRefreshTimer(10, callback)).toThrowError(
      "setRefreshTimer requires a browser environment",
    );

    // Restore the window object
    global.window = originalWindow;
  });
});
