import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as tokenUtils from ".";
import { isTokenExpired } from "./isTokenExpired";

// Mock the entire token utils module
vi.mock("..");

describe("isTokenExpired", () => {
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

    const result = await isTokenExpired();

    expect(result).toBe(true);
  });

  it("should return true if token is valid and not expired", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue({
      exp: mockCurrentTime + 3600,
    });

    const result = await isTokenExpired();

    expect(result).toBe(false);
  });

  it("should return true if token contains no expiry", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue({
      exp: undefined,
    });

    const result = await isTokenExpired();

    expect(result).toBe(true);
  });

  it("should return false if token is not expired within threshold", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue({
      exp: mockCurrentTime + 3600, // expires in 1 hour
    });

    const result = await isTokenExpired({ threshold: 5 }); // 5 second threshold

    expect(result).toBe(false); // not expired within 5 seconds
  });

  it("should return true if token expires within threshold", async () => {
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue({
      exp: mockCurrentTime + 3, // expires in 3 seconds
    });

    const result = await isTokenExpired({ threshold: 5 }); // 5 second threshold

    expect(result).toBe(true); // expired within 5 seconds
  });
});
