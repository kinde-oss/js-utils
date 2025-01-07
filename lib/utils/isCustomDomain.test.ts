import { isCustomDomain } from "./isCustomDomain";
import { describe, expect, it } from "vitest";

describe("isCustomDomain", () => {
  it("custom domain in use", () => {
    const result = isCustomDomain("www.test.com");
    expect(result).toEqual(true);
  });
  it("custom domain not in use", () => {
    const result = isCustomDomain("test.kinde.com");
    expect(result).toEqual(false);
  });
});
