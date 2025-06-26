import { describe, it, expect, beforeEach, vi } from "vitest";
import { KvStorage } from "./kvStorage";
import { StorageKeys } from "../types";
import { storageSettings } from "..";

enum ExtraKeys {
  testKey = "testKey2",
}

const createMockKV = () => {
  const store: Record<string, string> = {};
  
  return {
    async get(key: string): Promise<string | null> {
      return store[key] || null;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
      store[key] = value;
    },
    async delete(key: string): Promise<void> {
      delete store[key];
    },
    async list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }> {
      const keys = Object.keys(store);
      const filteredKeys = options?.prefix 
        ? keys.filter(key => key.startsWith(options.prefix!))
        : keys;
      return {
        keys: filteredKeys.map(name => ({ name }))
      };
    },
    _getStore: () => ({ ...store }),
    _clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    }
  };
};

describe("KvStorage standard keys", () => {
  let sessionManager: KvStorage;
  let mockKV: ReturnType<typeof createMockKV>;
  const consoleSpy = vi.spyOn(console, "warn");

  beforeEach(() => {
    mockKV = createMockKV();
    sessionManager = new KvStorage(mockKV);
    consoleSpy.mockClear();
  });

  it("should show warning when using insecure refresh token setting", () => {
    storageSettings.useInsecureForRefreshToken = true;
    new KvStorage(mockKV);
    expect(consoleSpy).toHaveBeenCalledWith(
      "KvStorage: useInsecureForRefreshToken is enabled - consider security implications for refresh tokens in KV storage"
    );
    storageSettings.useInsecureForRefreshToken = false;
  });

  it("should not show warning when using secure refresh tokens", () => {
    storageSettings.useInsecureForRefreshToken = false;
    new KvStorage(mockKV);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("should set and get an item in session storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );
  });

  it("should remove an item from session storage", async () => {
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      "testValue",
    );

    await sessionManager.removeSessionItem(StorageKeys.accessToken);
    expect(
      await sessionManager.getSessionItem(StorageKeys.accessToken),
    ).toBeNull();
  });

  it("should clear all items from session storage", async () => {
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
    const largeString = "x".repeat(storageSettings.maxLength * 2.5); // 5000 chars
    await sessionManager.setSessionItem(StorageKeys.accessToken, largeString);
    
    const store = mockKV._getStore();
    const chunks = Object.keys(store).filter(key => 
      key.startsWith(`${storageSettings.keyPrefix}${StorageKeys.accessToken}`)
    );
    expect(chunks.length).toBeGreaterThan(1);
    
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe(
      largeString,
    );
  });

  it("should handle non-string values by casting to string", async () => {
    await sessionManager.setSessionItem(StorageKeys.state, true);
    expect(await sessionManager.getSessionItem(StorageKeys.state)).toBe("true");
    
    await sessionManager.setSessionItem(StorageKeys.state, 42);
    expect(await sessionManager.getSessionItem(StorageKeys.state)).toBe("42");
  });

  it("should use default TTL", () => {
    expect(sessionManager.getDefaultTtl()).toBe(3600);
  });

  it("should allow setting custom TTL", () => {
    sessionManager.setDefaultTtl(7200);
    expect(sessionManager.getDefaultTtl()).toBe(7200);
  });

  it("should create with custom TTL in constructor", () => {
    const customManager = new KvStorage(mockKV, { defaultTtl: 1800 });
    expect(customManager.getDefaultTtl()).toBe(1800);
  });
});

describe("KvStorage custom keys", () => {
  let sessionManager: KvStorage<ExtraKeys>;
  let mockKV: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKV = createMockKV();
    sessionManager = new KvStorage<ExtraKeys>(mockKV);
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

  it("should clear all items including custom keys", async () => {
    await sessionManager.setSessionItem(ExtraKeys.testKey, "testValue");
    await sessionManager.setSessionItem(StorageKeys.accessToken, "tokenValue");
    
    await sessionManager.destroySession();
    
    expect(await sessionManager.getSessionItem(ExtraKeys.testKey)).toBeNull();
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBeNull();
  });
});

describe("KvStorage error handling", () => {
  let sessionManager: KvStorage;
  let mockKV: any;

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };
    sessionManager = new KvStorage(mockKV);
  });

  it("should handle get errors gracefully", async () => {
    mockKV.get.mockRejectedValue(new Error("KV error"));
    
    const result = await sessionManager.getSessionItem(StorageKeys.accessToken);
    expect(result).toBeNull();
  });

  it("should throw on set errors", async () => {
    mockKV.put.mockRejectedValue(new Error("KV error"));
    
    await expect(
      sessionManager.setSessionItem(StorageKeys.accessToken, "value")
    ).rejects.toThrow("KV error");
  });

  it("should throw on remove errors", async () => {
    mockKV.get.mockResolvedValue("value");
    mockKV.delete.mockRejectedValue(new Error("KV error"));
    
    await expect(
      sessionManager.removeSessionItem(StorageKeys.accessToken)
    ).rejects.toThrow("KV error");
  });

  it("should throw on destroySession errors", async () => {
    mockKV.list.mockRejectedValue(new Error("KV error"));
    
    await expect(sessionManager.destroySession()).rejects.toThrow("KV error");
  });
});