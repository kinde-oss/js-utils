import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StorageKeys } from "../sessionManager/types";

const expoSecureStoreMock = vi.hoisted(() => {
  const store = new Map<string, string>();

  return {
    setItemAsync: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
    deleteItemAsync: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: () => store.clear(),
  };
});

vi.mock("expo-secure-store", () => ({
  default: expoSecureStoreMock,
  ...expoSecureStoreMock,
}));

describe("@kinde/js-utils/expo entry", () => {
  beforeEach(() => {
    vi.resetModules();
    expoSecureStoreMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports ExpoSecureStore and related types from the expo entry", async () => {
    const expoEntry = await import("../expo");

    expect(expoEntry).toHaveProperty("ExpoSecureStore");
    expect(typeof expoEntry.ExpoSecureStore).toBe("function");
    expect(expoEntry).toHaveProperty("StorageKeys");
    expect(expoEntry.StorageKeys.accessToken).toBe("accessToken");
  });

  it("does not export ExpoSecureStore from the main entry", async () => {
    const mainEntry = await import("../main");

    expect(mainEntry).not.toHaveProperty("ExpoSecureStore");
  });

  it("allows creating and using ExpoSecureStore from the expo entry", async () => {
    const { ExpoSecureStore } = await import("../expo");

    const storage = new ExpoSecureStore();

    await storage.setSessionItem(StorageKeys.accessToken, "test-token");
    await vi.waitFor(async () => {
      expect(await storage.getSessionItem(StorageKeys.accessToken)).toBe(
        "test-token",
      );
    });

    await storage.removeSessionItem(StorageKeys.accessToken);
    expect(await storage.getSessionItem(StorageKeys.accessToken)).toBeNull();
  });

  it("loads expo-secure-store when ExpoSecureStore is used", async () => {
    const { ExpoSecureStore } = await import("../expo");

    const storage = new ExpoSecureStore();
    await storage.setSessionItem(StorageKeys.accessToken, "test-token");

    await vi.waitFor(() => {
      expect(expoSecureStoreMock.setItemAsync).toHaveBeenCalled();
    });
  });
});

describe("@kinde/js-utils/expo dist output", () => {
  it("keeps expo-secure-store out of the main bundle", async () => {
    const mainDistPath = resolve(process.cwd(), "dist/js-utils.js");
    const mainDist = await readFile(mainDistPath, "utf8");

    expect(mainDist).not.toContain("expo-secure-store");
    expect(mainDist).not.toContain("expoSecureStore");
  });

  it("ships a self-contained expo bundle with expo-secure-store", async () => {
    const expoDistPath = resolve(process.cwd(), "dist/expo.js");
    const expoDist = await readFile(expoDistPath, "utf8");

    expect(expoDist).toContain("ExpoSecureStore");
    expect(expoDist).toContain("expo-secure-store");
    expect(expoDist).not.toMatch(/from "\.\/[^"]+\.js"/);
  });

  it("does not re-export the full main bundle from the expo entry", async () => {
    const expoDistPath = resolve(process.cwd(), "dist/expo.js");
    const expoDist = await readFile(expoDistPath, "utf8");

    expect(expoDist).not.toContain("LocalStorage");
    expect(expoDist).not.toContain("getClaim");
    expect(expoDist).not.toContain("base64UrlEncode");
  });

  it("does not emit shared expo chunks in dist", async () => {
    const distDir = resolve(process.cwd(), "dist");
    const distFiles = await readdir(distDir);

    expect(distFiles.some((file) => file.startsWith("sessionManager-"))).toBe(
      false,
    );
  });

  it("does not place expo-secure-store in unrelated dist files", async () => {
    const distDir = resolve(process.cwd(), "dist");
    const distFiles = (await readdir(distDir)).filter((file) =>
      file.endsWith(".js"),
    );

    for (const file of distFiles) {
      if (file === "expo.js") {
        continue;
      }

      const contents = await readFile(resolve(distDir, file), "utf8");
      expect(contents).not.toContain("expo-secure-store");
    }
  });
});

describe("@kinde/js-utils/expo tree-shaking", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("main entry can be used without touching expo code", async () => {
    const { LocalStorage, MemoryStorage, base64UrlEncode } =
      await import("../main");

    expect(LocalStorage).toBeDefined();
    expect(MemoryStorage).toBeDefined();
    expect(base64UrlEncode("test")).toBe("dGVzdA");

    const storage = new LocalStorage();
    expect(storage).toBeDefined();
  });
});
