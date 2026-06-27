import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

describe("main bundle isolation", () => {
  it("main dist does not reference expo-secure-store", async () => {
    const distPath = resolve(process.cwd(), "dist/js-utils.js");
    const dist = await readFile(distPath, "utf8");
    expect(dist).not.toContain("expo-secure-store");
    expect(dist).not.toContain("expoSecureStore");
  });
});
