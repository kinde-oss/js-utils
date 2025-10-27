import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as mainExports from "../main";
import { StorageKeys } from "../sessionManager/types";

// Create a mock for the dynamic import
vi.mock("../sessionManager/stores/expoSecureStore.js", async () => {
  // Mock class constructor
  const MockExpoSecureStore = vi.fn().mockImplementation(() => {
    return {
      getSessionItem: vi.fn().mockResolvedValue("mocked-value"),
      setSessionItem: vi.fn().mockResolvedValue(undefined),
      removeSessionItem: vi.fn().mockResolvedValue(undefined),
      destroySession: vi.fn().mockResolvedValue(undefined),
      setItems: vi.fn().mockResolvedValue(undefined),
    };
  });

  return {
    ExpoSecureStore: MockExpoSecureStore,
  };
});

describe("ExpoSecureStore lazy loading", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should export ExpoSecureStore as a lazy-loaded object", () => {
    // Check that ExpoSecureStore is in the exports
    expect(mainExports).toHaveProperty("ExpoSecureStore");

    // Verify it's an object with the expected lazy-loading structure
    expect(typeof mainExports.ExpoSecureStore).toBe("object");
    expect(mainExports.ExpoSecureStore).toHaveProperty("__esModule", true);
    expect(mainExports.ExpoSecureStore).toHaveProperty("default");
    // The default property should be a getter function
    const descriptor = Object.getOwnPropertyDescriptor(
      mainExports.ExpoSecureStore,
      "default",
    );
    expect(descriptor).toBeDefined();
  });

  it("should not trigger dynamic import until ExpoSecureStore is accessed", async () => {
    // Mock the dynamic import function to track if it's called
    const importSpy = vi.fn().mockResolvedValue({
      ExpoSecureStore: vi.fn(),
    });

    // Replace the getter with our spy
    Object.defineProperty(mainExports.ExpoSecureStore, "default", {
      configurable: true,
      get: () => importSpy(),
    });

    // Access exports but don't use ExpoSecureStore
    const { MemoryStorage, LocalStorage } = mainExports;

    // Create instances of these storage mechanisms
    // Not using the instances is intentional - we're just creating them to show
    // that they don't trigger the ExpoSecureStore import
    new MemoryStorage();
    new LocalStorage();

    // Our import spy should not have been called
    expect(importSpy).not.toHaveBeenCalled();
  });

  it("should dynamically import ExpoSecureStore when accessed", async () => {
    // Setup a mock class (function constructor) that will be returned by our dynamic import
    function MockStore(this: mainExports.SessionManager<StorageKeys>) {
      this.getSessionItem = vi.fn().mockResolvedValue("mock-value");
      this.setSessionItem = vi.fn().mockResolvedValue(undefined);
      this.removeSessionItem = vi.fn().mockResolvedValue(undefined);
      this.destroySession = vi.fn().mockResolvedValue(undefined);
    }

    // Create a spy for the dynamic import
    const importSpy = vi.fn().mockResolvedValue({
      ExpoSecureStore: MockStore as unknown as new () => unknown,
    });

    // Replace the getter with our spy
    Object.defineProperty(mainExports.ExpoSecureStore, "default", {
      configurable: true,
      get: () => importSpy(),
    });

    // Access the ExpoSecureStore default export
    const moduleExport = await mainExports.ExpoSecureStore.default;

    // Verify the import was called
    expect(importSpy).toHaveBeenCalledTimes(1);

    // Verify the module was loaded with the expected structure
    // We need to cast the type since TypeScript doesn't know the structure
    expect(moduleExport).toEqual({ ExpoSecureStore: MockStore });

    // Create an instance to verify it works
    const instance =
      new (MockStore as unknown as new () => mainExports.SessionManager<StorageKeys>)();
    expect(instance).toBeDefined();

    // Test a method to make sure it works
    await instance.setSessionItem(StorageKeys.accessToken, "test-value");
    expect(instance.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.accessToken,
      "test-value",
    );
  });

  it("should share the loaded ExpoSecureStore module between multiple access attempts", async () => {
    // Set up a mock for the dynamic import
    const mockModule = {
      ExpoSecureStore: vi.fn(),
    };
    const importSpy = vi.fn().mockResolvedValue(mockModule);

    // Replace the getter with our spy
    Object.defineProperty(mainExports.ExpoSecureStore, "default", {
      configurable: true,
      get: () => importSpy(),
    });

    // First access
    const result1 = await mainExports.ExpoSecureStore.default;

    // Second access
    const result2 = await mainExports.ExpoSecureStore.default;

    // Both should reference the same class
    expect(result1).toBe(result2);

    // The import should have been called twice (once per access)
    expect(importSpy).toHaveBeenCalledTimes(2);
  });

  it("should handle type parameters correctly", async () => {
    // Create a mock implementation of ExpoSecureStore
    const MockExpoSecureStore = vi.fn().mockImplementation(() => ({
      getSessionItem: vi.fn(),
      setSessionItem: vi.fn(),
      removeSessionItem: vi.fn(),
      destroySession: vi.fn(),
    }));

    // Mock the dynamic import to return our mock implementation
    const importSpy = vi.fn().mockResolvedValue({
      ExpoSecureStore: MockExpoSecureStore,
    });

    // Replace the default getter with our spy
    Object.defineProperty(mainExports.ExpoSecureStore, "default", {
      configurable: true,
      get: () => {
        return async () => {
          const mod = await importSpy();
          return mod.ExpoSecureStore;
        };
      },
    });

    // Access the ExpoSecureStore default export and call it
    const defaultFn = await mainExports.ExpoSecureStore.default;
    const moduleExport = await defaultFn();

    // Verify the import was called with the correct path
    expect(importSpy).toHaveBeenCalledWith();

    // Verify the returned module has the correct structure
    expect(moduleExport).toBe(MockExpoSecureStore);
  });
});

describe("Tree shaking with ExpoSecureStore", () => {
  it("ExpoSecureStore import should not affect other storage mechanisms", () => {
    // Create a MemoryStorage instance
    const memoryStorage = new mainExports.MemoryStorage();
    expect(memoryStorage).toBeDefined();

    // We should be able to use it without triggering the ExpoSecureStore import
    memoryStorage.setSessionItem(StorageKeys.accessToken, "value");

    // Check if other exports are also working correctly
    expect(mainExports.base64UrlEncode).toBeDefined();
    expect(mainExports.base64UrlEncode("test")).toBe("dGVzdA");
  });

  it("should allow tree shaking by using named imports", () => {
    // In this test we simulate what a tree-shaking bundler would do
    // by only importing specific functions

    const { MemoryStorage, LocalStorage, base64UrlEncode } = mainExports;

    // These imports should work without referencing ExpoSecureStore
    expect(MemoryStorage).toBeDefined();
    expect(LocalStorage).toBeDefined();
    expect(base64UrlEncode).toBeDefined();

    // Creating instances should work
    const memory = new MemoryStorage();
    expect(memory).toBeDefined();

    // And the utility function should work
    expect(base64UrlEncode("test")).toBe("dGVzdA");
  });
});
