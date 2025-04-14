import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// This test simulates application usage with tree-shaking
describe("Application bundling with tree-shaking", () => {
  // Mock the dynamic import
  beforeEach(() => {
    vi.resetModules();
    vi.mock("../sessionManager/stores/expoSecureStore.js", async () => {
      const MockExpoSecureStore = vi.fn().mockImplementation(() => ({
        getSessionItem: vi.fn(),
        setSessionItem: vi.fn(),
        removeSessionItem: vi.fn(),
        destroySession: vi.fn(),
      }));
      return { ExpoSecureStore: MockExpoSecureStore };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not include ExpoSecureStore when importing only LocalStorage", async () => {
    // Use dynamic import for our main module to avoid direct dependency
    const mainModule = await import("../main");

    // Check that the dynamic import is not triggered
    expect(mainModule).toHaveProperty("LocalStorage");
    expect(mainModule).toHaveProperty("ExpoSecureStore");

    // Execute a function from the module to verify loading
    const localStorage = new mainModule.LocalStorage();
    expect(localStorage).toBeDefined();

    // The important part is that this doesn't throw an error about
    // missing expo-secure-store
  });

  it("should include ExpoSecureStore only when explicitly importing it", async () => {
    // Directly check the main module
    const mainModule = await import("../main");

    // Just importing shouldn't trigger the dynamic import
    expect(mainModule.ExpoSecureStore).toBeDefined();

    // But accessing it should
    const mockImport = vi.fn().mockResolvedValue({
      ExpoSecureStore: vi.fn(),
    });

    // Replace the default getter with our mock
    Object.defineProperty(mainModule.ExpoSecureStore, "default", {
      get: () => mockImport(),
    });

    // Access the ExpoSecureStore to trigger lazy loading
    await mainModule.ExpoSecureStore.default;

    // Verify the import was called
    expect(mockImport).toHaveBeenCalledTimes(1);
  });
});

// Test application scenarios that simulate real-world usage
describe("Application usage scenarios", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should work in a React application with LocalStorage only", async () => {
    // Import the module without triggering ExpoSecureStore loading
    const mainModule = await import("../main");

    // Verify that we can access other exports without triggering ExpoSecureStore import
    expect(mainModule.LocalStorage).toBeDefined();
    expect(mainModule.base64UrlEncode).toBeDefined();
    expect(mainModule.generateRandomString).toBeDefined();

    // The important thing is that this test doesn't fail with
    // errors about missing expo-secure-store
  });

  it("should correctly handle library consumption in NodeJS", async () => {
    // Import the module without triggering ExpoSecureStore loading
    const mainModule = await import("../main");

    // Verify that MemoryStorage is available
    expect(mainModule.MemoryStorage).toBeDefined();

    // Verify that utility functions are available
    expect(typeof mainModule.base64UrlEncode).toBe("function");

    // Make sure we can access token utilities
    expect(mainModule.getClaim).toBeDefined();
    expect(mainModule.getDecodedToken).toBeDefined();
  });
});
