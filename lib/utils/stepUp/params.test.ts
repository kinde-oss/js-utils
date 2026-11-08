import { describe, expect, it } from "vitest";
import {
  acrFromStored,
  formatAcrValues,
  highestAcr,
  maxAgeFromStored,
} from "./params";

describe("formatAcrValues", () => {
  it("omits an empty list and rejects values other than mfa or phr", () => {
    expect(formatAcrValues([])).toBeUndefined();
    expect(formatAcrValues("")).toBeUndefined();
    expect(() => formatAcrValues(1)).toThrow(/mfa" or "phr"/);
    expect(() => formatAcrValues("otp")).toThrow(/Received otp/);
  });

  it("accepts the space-separated wire value", () => {
    expect(formatAcrValues("mfa phr")).toBe("mfa phr");
    expect(formatAcrValues(" MFA ")).toBe("mfa");
    expect(() => formatAcrValues("mfa otp")).toThrow(/Received otp/);
  });
});

describe("highestAcr", () => {
  it("returns null when nothing recognised was requested", () => {
    expect(highestAcr(null)).toBeNull();
    expect(highestAcr("")).toBeNull();
    expect(highestAcr("otp google")).toBeNull();
    expect(acrFromStored(1)).toBeNull();
  });
});

describe("maxAgeFromStored", () => {
  it("returns null unless the stored value is a non-negative integer", () => {
    expect(maxAgeFromStored(undefined)).toBeNull();
    expect(maxAgeFromStored("")).toBeNull();
    expect(maxAgeFromStored("-1")).toBeNull();
    expect(maxAgeFromStored("1.5")).toBeNull();
    expect(maxAgeFromStored("0")).toBe(0);
  });
});
