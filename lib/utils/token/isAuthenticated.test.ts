import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isAuthenticated } from ".";
import * as tokenUtils from ".";

// Mock the entire token utils module
vi.mock("..");

describe("isAuthenticated", () => {
  const mockCurrentTime = 1000000000;

  beforeEach(() => {
    // Mock Date.now() to return a fixed timestamp
    vi.spyOn(Date, "now").mockImplementation(() => mockCurrentTime * 1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return false if no token is found", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue(null);

    const result = await isAuthenticated();

    expect(result).toBe(false);
  });

  it("should return true if token is valid and not expired", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue({
      exp: mockCurrentTime + 3600,
    });

    const result = await isAuthenticated();

    expect(result).toBe(true);
  });

  it("should return false if token is expired and useRefreshToken is not set", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue({
      exp: mockCurrentTime - 3600,
    });

    const result = await isAuthenticated();

    expect(result).toBe(false);
  });

  it("should attempt to refresh token if expired and useRefreshToken is true", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue({
      exp: mockCurrentTime - 3600,
    });
    const mockRefreshToken = vi
      .spyOn(tokenUtils, "refreshToken")
      .mockResolvedValue({ success: true });

    const result = await isAuthenticated({
      useRefreshToken: true,
      domain: "test.com",
      clientId: "123",
    });

    expect(result).toBe(true);
    expect(mockRefreshToken).toHaveBeenCalledWith({domain: "test.com", clientId: "123"});
  });

  it("should return false if token refresh fails", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue({
      exp: mockCurrentTime - 3600,
    });
    vi.spyOn(tokenUtils, "refreshToken").mockResolvedValue({ success: false });

    const result = await isAuthenticated({
      useRefreshToken: true,
      domain: "test.com",
      clientId: "123",
    });

    expect(result).toBe(false);
  });

  it("should return false and log error if an exception occurs", async () => {
    const mockError = new Error("Test error");
    vi.spyOn(tokenUtils, "getDecodedToken").mockRejectedValue(mockError);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await isAuthenticated();

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error checking authentication:",
      mockError,
    );
  });

  it("should return false if token is missing exp", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue({
      // Missing 'exp' field
    });

    const result = await isAuthenticated();

    expect(result).toBe(false);
  });
});
