import { describe, it, expect, beforeEach, vi } from "vitest";
import { KvStorage } from "./kvStorage";
import { StorageKeys } from "../types";
import { storageSettings } from "..";

enum ExtraKeys {
  testKey = "testKey2",
}

// Mock Cloudflare KV interface with controllable behavior
const createMockKV = () => {
  const store: Record<string, string> = {};
  let getDelay = 0;
  let putDelay = 0;
  let simulateEventualConsistency = false;
  let consistencyCounter = 0;
  
  return {
    async get(key: string): Promise<string | null> {
      if (getDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, getDelay));
      }
      
      // Simulate eventual consistency - first few reads return null even if data exists
      if (simulateEventualConsistency && store[key] && consistencyCounter < 2) {
        consistencyCounter++;
        return null;
      }
      
      return store[key] || null;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
      if (putDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, putDelay));
      }
      store[key] = value;
      consistencyCounter = 0; // Reset consistency simulation
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
    // Test helpers
    _getStore: () => ({ ...store }),
    _clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
      consistencyCounter = 0;
    },
    _setGetDelay: (ms: number) => { getDelay = ms; },
    _setPutDelay: (ms: number) => { putDelay = ms; },
    _simulateEventualConsistency: (enabled: boolean) => { 
      simulateEventualConsistency = enabled; 
      consistencyCounter = 0;
    }
  };
};

describe("KvStorage standard functionality", () => {
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

  it("should handle large strings by chunking", async () => {
    const largeString = "x".repeat(storageSettings.maxLength * 2.5); // 5000 chars
    await sessionManager.setSessionItem(StorageKeys.accessToken, largeString);
    
    // Check that multiple chunks were created
    const store = mockKV._getStore();
    const chunks = Object.keys(store).filter(key => 
      key.startsWith(`${storageSettings.keyPrefix}${StorageKeys.accessToken}`)
    );
    expect(chunks.length).toBeGreaterThan(1);
    
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
});

describe("KvStorage consistency features", () => {
  let sessionManager: KvStorage;
  let mockKV: ReturnType<typeof createMockKV>;
  const consoleSpy = vi.spyOn(console, "warn");

  beforeEach(() => {
    mockKV = createMockKV();
    consoleSpy.mockClear();
  });

  it("should use default consistency options", () => {
    sessionManager = new KvStorage(mockKV);
    const options = sessionManager.getConsistencyOptions();
    
    expect(options.enabled).toBe(true);
    expect(options.retries).toBe(3);
    expect(options.delayMs).toBe(250);
  });

  it("should accept custom consistency options in constructor", () => {
    sessionManager = new KvStorage(mockKV, {
      enableConsistencyChecks: false,
      consistencyRetries: 5,
      consistencyDelayMs: 500
    });
    
    const options = sessionManager.getConsistencyOptions();
    expect(options.enabled).toBe(false);
    expect(options.retries).toBe(5);
    expect(options.delayMs).toBe(500);
  });

  it("should allow updating consistency options", () => {
    sessionManager = new KvStorage(mockKV);
    
    sessionManager.setConsistencyOptions({
      enabled: false,
      retries: 2,
      delayMs: 100
    });
    
    const options = sessionManager.getConsistencyOptions();
    expect(options.enabled).toBe(false);
    expect(options.retries).toBe(2);
    expect(options.delayMs).toBe(100);
  });

  it("should handle eventual consistency during read operations", async () => {
    sessionManager = new KvStorage(mockKV, {
      enableConsistencyChecks: true,
      consistencyRetries: 3,
      consistencyDelayMs: 10 // Faster for testing
    });

    // First store the value normally
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    
    // Clear the store and simulate eventual consistency
    mockKV._clear();
    mockKV._getStore()[`${storageSettings.keyPrefix}${StorageKeys.accessToken}0`] = "testValue";
    mockKV._simulateEventualConsistency(true);
    
    // Should eventually succeed with retries
    const result = await sessionManager.getSessionItem(StorageKeys.accessToken);
    expect(result).toBe("testValue");
  });

  it("should skip retries when consistency checks disabled", async () => {
    sessionManager = new KvStorage(mockKV, {
      enableConsistencyChecks: false
    });

    mockKV._simulateEventualConsistency(true);
    
    // Should return null immediately without retries
    const result = await sessionManager.getSessionItem(StorageKeys.accessToken);
    expect(result).toBeNull();
  });

  it("should verify writes when consistency checks enabled", async () => {
    sessionManager = new KvStorage(mockKV, {
      enableConsistencyChecks: true,
      consistencyDelayMs: 10 // Faster for testing
    });

    mockKV._simulateEventualConsistency(true);
    
    // Should complete successfully despite initial read failures
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    
    // Value should be readable after write completes
    const result = await sessionManager.getSessionItem(StorageKeys.accessToken);
    expect(result).toBe("testValue");
  });

  it("should warn when consistency verification fails", async () => {
    sessionManager = new KvStorage(mockKV, {
      enableConsistencyChecks: true,
      consistencyRetries: 2,
      consistencyDelayMs: 1
    });

    // Simulate persistent inconsistency
    const originalGet = mockKV.get;
    mockKV.get = vi.fn().mockResolvedValue(null);
    
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    
    expect(consoleSpy).toHaveBeenCalledWith(
      `KvStorage: Consistency check failed for ${StorageKeys.accessToken} after 2 attempts`
    );
    
    // Restore original method
    mockKV.get = originalGet;
  });

  it("should use sequential writes for setItems with consistency checks", async () => {
    sessionManager = new KvStorage(mockKV, {
      enableConsistencyChecks: true,
      consistencyDelayMs: 1
    });

    const putSpy = vi.spyOn(mockKV, 'put');
    
    await sessionManager.setItems({
      [StorageKeys.accessToken]: "accessValue",
      [StorageKeys.idToken]: "idValue",
    });

    // Should call put multiple times (clearing + setting for each item)
    expect(putSpy).toHaveBeenCalled();
    
    // Both values should be stored
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe("accessValue");
    expect(await sessionManager.getSessionItem(StorageKeys.idToken)).toBe("idValue");
  });

  it("should use parallel writes for setItems with consistency checks disabled", async () => {
    sessionManager = new KvStorage(mockKV, {
      enableConsistencyChecks: false
    });

    await sessionManager.setItems({
      [StorageKeys.accessToken]: "accessValue",
      [StorageKeys.idToken]: "idValue",
    });

    // Both values should be stored
    expect(await sessionManager.getSessionItem(StorageKeys.accessToken)).toBe("accessValue");
    expect(await sessionManager.getSessionItem(StorageKeys.idToken)).toBe("idValue");
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

describe("KvStorage TTL functionality", () => {
  let sessionManager: KvStorage;
  let mockKV: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKV = createMockKV();
  });

  it("should use default TTL", () => {
    sessionManager = new KvStorage(mockKV);
    expect(sessionManager.getDefaultTtl()).toBe(3600);
  });

  it("should allow setting custom TTL", () => {
    sessionManager = new KvStorage(mockKV);
    sessionManager.setDefaultTtl(7200);
    expect(sessionManager.getDefaultTtl()).toBe(7200);
  });

  it("should create with custom TTL in constructor", () => {
    sessionManager = new KvStorage(mockKV, { defaultTtl: 1800 });
    expect(sessionManager.getDefaultTtl()).toBe(1800);
  });

  it("should pass TTL to KV put operations", async () => {
    sessionManager = new KvStorage(mockKV, { defaultTtl: 1200 });
    const putSpy = vi.spyOn(mockKV, 'put');
    
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    
    expect(putSpy).toHaveBeenCalledWith(
      expect.stringContaining(StorageKeys.accessToken),
      "testValue",
      { expirationTtl: 1200 }
    );
  });
});

describe("KvStorage performance scenarios", () => {
  let sessionManager: KvStorage;
  let mockKV: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKV = createMockKV();
  });

  it("should handle slow KV operations gracefully", async () => {
    sessionManager = new KvStorage(mockKV, {
      enableConsistencyChecks: true,
      consistencyDelayMs: 10
    });

    // Simulate slow KV operations
    mockKV._setPutDelay(20);
    mockKV._setGetDelay(20);
    
    const start = Date.now();
    await sessionManager.setSessionItem(StorageKeys.accessToken, "testValue");
    const result = await sessionManager.getSessionItem(StorageKeys.accessToken);
    const duration = Date.now() - start;
    
    expect(result).toBe("testValue");
    expect(duration).toBeGreaterThan(30); // Should account for delays
  });

  it("should timeout appropriately with consistency retries", async () => {
    sessionManager = new KvStorage(mockKV, {
      enableConsistencyChecks: true,
      consistencyRetries: 2,
      consistencyDelayMs: 50
    });

    // Make reads always fail
    mockKV.get = vi.fn().mockResolvedValue(null);
    
    const start = Date.now();
    const result = await sessionManager.getSessionItem(StorageKeys.accessToken);
    const duration = Date.now() - start;
    
    expect(result).toBeNull();
    // Should have tried 2 times with 50ms and 100ms delays
    expect(duration).toBeGreaterThan(140); // 50 + 100 + some overhead
  });
});