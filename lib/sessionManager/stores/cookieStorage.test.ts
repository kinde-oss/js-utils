// js-utils/lib/sessionManager/stores/cookieStorage.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CookieStorage, createGenericCookieAdapter, type CookieAdapter, type CookieOptions } from "./cookieStorage";
import { StorageKeys } from "../types";
import { storageSettings } from "..";

enum ExtraKeys {
  testKey = "testKey2",
}

// Mock cookie adapter for testing
const createMockCookieAdapter = () => {
  const cookies: Record<string, string> = {};
  
  return {
    cookies, // Expose for testing
    adapter: {
      get: (name: string) => cookies[name] || null,
      set: (name: string, value: string, options?: CookieOptions) => {
        cookies[name] = value;
      },
      delete: (name: string, options?: CookieOptions) => {
        delete cookies[name];
      }
    } as CookieAdapter,
    clear: () => {
      Object.keys(cookies).forEach(key => delete cookies[key]);
    }
  };
};

describe("CookieStorage standard keys", () => {
  let sessionManager: CookieStorage;
  let mockCookies: ReturnType<typeof createMockCookieAdapter>;
  const consoleSpy = vi.spyOn(console, "warn");

  beforeEach(() => {
    mockCookies = createMockCookieAdapter();
    sessionManager = new CookieStorage(mockCookies.adapter);
    consoleSpy.mockClear();
    mockCookies.clear();
  });

  it("should show warning when using insecure refresh token setting", () => {
    storageSettings.useInsecureForRefreshToken = true;
    new CookieStorage(mockCookies.adapter);
    expect(consoleSpy).toHaveBeenCalledWith(
      "CookieStorage: useInsecureForRefreshToken is enabled - refresh tokens will be stored in cookies which may have security implications"
    );
    storageSettings.useInsecureForRefreshToken = false;
  });

  it("should not show warning when using secure settings", () => {
    storageSettings.useInsecureForRefreshToken = false;
    new CookieStorage(mockCookies.adapter);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("should set and get an item in cookie storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );
  });

  it("should remove an item from cookie storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    await sessionManager.removeSessionItem(StorageKeys.accessToken);
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should clear all items from cookie storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    await sessionManager.destroySession();
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should set many items", async () => {
    await sessionManager.setItems({
      [StorageKeys.accessToken]: "accessTokenValue",
      [StorageKeys.idToken]: "idTokenValue",
    });
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "accessTokenValue",
    );
    expect(await sessionManager.getSessionItem(StorageKeys.idToken)).toBe(
      "idTokenValue",
    );
  });

  it("should handle large strings by chunking", async () => {
    const largeString = "x".repeat(sessionManager.getMaxChunkSize() * 2.5);
    await sessionManager.setSessionItem(StorageKeys.accessToken, largeString);
    
    // Check that multiple chunks were created
    const chunkCount = Object.keys(mockCookies.cookies).filter(key => 
      key.startsWith(`${storageSettings.keyPrefix}${StorageKeys.accessToken}`)
    ).length;
    expect(chunkCount).toBeGreaterThan(1);
    
    // Verify we can retrieve the full string
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      largeString,
    );
  });

  it("should handle non-string values", async () => {
    const objectValue = { test: "value", number: 42 };
    await sessionManager.setSessionItem(StorageKeys.state, objectValue);
    
    const retrieved = await sessionManager.getSessionItem(StorageKeys.state);
    expect(retrieved).toBe(JSON.stringify(objectValue));
  });

  it("should use default options", () => {
    const defaultOptions = sessionManager.getDefaultOptions();
    expect(defaultOptions.httpOnly).toBe(true);
    expect(defaultOptions.secure).toBe(true);
    expect(defaultOptions.sameSite).toBe('lax');
    expect(defaultOptions.path).toBe('/');
    expect(defaultOptions.maxAge).toBe(900);
  });

  it("should allow custom options in constructor", () => {
    const customStorage = new CookieStorage(mockCookies.adapter, {
      defaultOptions: {
        maxAge: 1800,
        sameSite: 'strict'
      }
    });
    
    const options = customStorage.getDefaultOptions();
    expect(options.maxAge).toBe(1800);
    expect(options.sameSite).toBe('strict');
    expect(options.httpOnly).toBe(true); // Should keep other defaults
  });

  it("should allow updating default options", () => {
    sessionManager.setDefaultOptions({ maxAge: 3600 });
    const options = sessionManager.getDefaultOptions();
    expect(options.maxAge).toBe(3600);
  });

  it("should use custom chunk size", () => {
    const customStorage = new CookieStorage(mockCookies.adapter, {
      maxChunkSize: 1000
    });
    expect(customStorage.getMaxChunkSize()).toBe(1000);
  });
});

describe("CookieStorage custom keys", () => {
  let sessionManager: CookieStorage<ExtraKeys>;
  let mockCookies: ReturnType<typeof createMockCookieAdapter>;

  beforeEach(() => {
    mockCookies = createMockCookieAdapter();
    sessionManager = new CookieStorage<ExtraKeys>(mockCookies.adapter);
    mockCookies.clear();
  });

  it("should set and get an item with custom key type", async () => {
    await sessionManager.setSessionItem(ExtraKeys.testKey, "testValue");
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBe(
      "testValue",
    );
  });

  it("should still work with standard StorageKeys", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );
  });

  it("should clear all items including standard keys", async () => {
    await sessionManager.setSessionItem(ExtraKeys.testKey, "testValue");
    await sessionManager.setSessionItem(StorageKeys.accessToken, "tokenValue");
    
    await sessionManager.destroySession();
    
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBeNull();
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBeNull();
  });
});

describe("CookieStorage error handling", () => {
  let sessionManager: CookieStorage;
  let mockAdapter: any;

  beforeEach(() => {
    mockAdapter = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    sessionManager = new CookieStorage(mockAdapter);
  });

  it("should handle get errors gracefully", async () => {
    mockAdapter.get.mockImplementation(() => {
      throw new Error("Cookie error");
    });
    
    const result = await sessionManager.getSessionItem(StorageKeys.accessToken);
    expect(result).toBeNull();
  });

  it("should throw on set errors", async () => {
    mockAdapter.set.mockImplementation(() => {
      throw new Error("Cookie error");
    });
    
    await expect(
      sessionManager.setSessionItem(StorageKeys.accessToken, "value")
    ).rejects.toThrow("Cookie error");
  });

  it("should throw on remove errors", async () => {
    mockAdapter.get.mockReturnValue("value");
    mockAdapter.delete.mockImplementation(() => {
      throw new Error("Cookie error");
    });
    
    await expect(
      sessionManager.removeSessionItem(StorageKeys.accessToken)
    ).rejects.toThrow("Cookie error");
  });
});

describe("createGenericCookieAdapter", () => {
  it("should create a working cookie adapter", () => {
    const mockCookies: Record<string, string> = {};
    
    const adapter = createGenericCookieAdapter(
      (name) => mockCookies[name],
      (name, value) => { mockCookies[name] = value; },
      (name) => { delete mockCookies[name]; }
    );
    
    adapter.set("test", "value");
    expect(adapter.get("test")).toBe("value");
    
    adapter.delete("test");
    expect(adapter.get("test")).toBeUndefined();
  });
});

describe("CookieStorage chunking behavior", () => {
  let sessionManager: CookieStorage;
  let mockCookies: ReturnType<typeof createMockCookieAdapter>;

  beforeEach(() => {
    mockCookies = createMockCookieAdapter();
    // Use small chunk size for testing
    sessionManager = new CookieStorage(mockCookies.adapter, {
      maxChunkSize: 10
    });
    mockCookies.clear();
  });

  it("should chunk large values correctly", async () => {
    const testValue = "0123456789abcdefghij"; // 20 chars, should create 2 chunks
    await sessionManager.setSessionItem(StorageKeys.state, testValue);
    
    // Should have 2 cookies
    const cookieKeys = Object.keys(mockCookies.cookies);
    expect(cookieKeys).toHaveLength(2);
    expect(cookieKeys).toContain(`${storageSettings.keyPrefix}state0`);
    expect(cookieKeys).toContain(`${storageSettings.keyPrefix}state1`);
    
    // Should reconstruct correctly
    const retrieved = await sessionManager.getSessionItem(StorageKeys.state);
    expect(retrieved).toBe(testValue);
  });

  it("should handle removing chunked items completely", async () => {
    const testValue = "0123456789abcdefghij"; // 20 chars, creates 2 chunks
    await sessionManager.setSessionItem(StorageKeys.state, testValue);
    
    // Verify chunks exist
    expect(Object.keys(mockCookies.cookies)).toHaveLength(2);
    
    // Remove the item
    await sessionManager.removeSessionItem(StorageKeys.state);
    
    // All chunks should be gone
    expect(Object.keys(mockCookies.cookies)).toHaveLength(0);
    expect(await sessionManager.getSessionItem(StorageKeys.state)).toBeNull();
  });
});