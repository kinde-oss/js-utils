import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Application bundling with tree-shaking", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not export ExpoSecureStore from the main entry", async () => {
    const mainModule = await import("../main");

    expect(mainModule).toHaveProperty("LocalStorage");
    expect(mainModule).not.toHaveProperty("ExpoSecureStore");
  });

  it("should use LocalStorage from main without expo-secure-store", async () => {
    const mainModule = await import("../main");

    const storage = new mainModule.LocalStorage();
    expect(storage).toBeDefined();
  });

  it("main dist bundle contains no expo-secure-store references", async () => {
    const mainDistPath = resolve(process.cwd(), "dist/js-utils.js");
    const mainDist = await readFile(mainDistPath, "utf8");

    expect(mainDist).not.toContain("expo-secure-store");
    expect(mainDist).not.toContain("expoSecureStore");
    expect(mainDist).not.toContain("ExpoSecureStore");
  });
});

describe("Application usage scenarios", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should work in a React application with LocalStorage only", async () => {
    const mainModule = await import("../main");

    expect(mainModule).not.toHaveProperty("ExpoSecureStore");
    expect(mainModule.LocalStorage).toBeDefined();
    expect(mainModule.base64UrlEncode).toBeDefined();
    expect(mainModule.generateRandomString).toBeDefined();
  });

  it("should correctly handle library consumption in NodeJS", async () => {
    const mainModule = await import("../main");

    expect(mainModule).not.toHaveProperty("ExpoSecureStore");
    expect(mainModule.MemoryStorage).toBeDefined();
    expect(typeof mainModule.base64UrlEncode).toBe("function");
    expect(mainModule.getClaim).toBeDefined();
    expect(mainModule.getDecodedToken).toBeDefined();
  });

  it("should allow tree shaking by using named imports from main only", async () => {
    const { MemoryStorage, LocalStorage, base64UrlEncode } =
      await import("../main");

    expect(MemoryStorage).toBeDefined();
    expect(LocalStorage).toBeDefined();
    expect(base64UrlEncode("test")).toBe("dGVzdA");

    const memory = new MemoryStorage();
    expect(memory).toBeDefined();
  });
});
