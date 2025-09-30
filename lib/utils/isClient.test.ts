import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isClient } from "./isClient";

describe("isClient", () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    // Save the original window object
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    // Restore the original window object
    globalThis.window = originalWindow;
  });

  it("should return true when window is defined (client environment)", () => {
    // Ensure window is defined (default in vitest browser mode)
    if (typeof globalThis.window === "undefined") {
      // @ts-expect-error - Setting window for testing purposes
      globalThis.window = {};
    }

    const result = isClient();
    expect(result).toBe(true);
  });

  it("should return false when window is undefined (server environment)", () => {
    // @ts-expect-error - Deleting window for testing purposes
    delete globalThis.window;

    const result = isClient();
    expect(result).toBe(false);
  });

  it("should return true when window exists with properties", () => {
    globalThis.window = {} as Window & typeof globalThis;

    const result = isClient();
    expect(result).toBe(true);
  });

  it("should return true even when window is an empty object", () => {
    // @ts-expect-error - Setting window for testing purposes
    globalThis.window = {};

    const result = isClient();
    expect(result).toBe(true);
  });

  it("should consistently return the same result when called multiple times", () => {
    const firstCall = isClient();
    const secondCall = isClient();
    const thirdCall = isClient();

    expect(firstCall).toBe(secondCall);
    expect(secondCall).toBe(thirdCall);
  });

  it("should return false when window is explicitly set to undefined", () => {
    // @ts-expect-error - Setting window to undefined for testing purposes
    globalThis.window = undefined;

    const result = isClient();
    expect(result).toBe(false);
  });
});
