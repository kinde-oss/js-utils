import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import ts from "@typescript/typescript6";

const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(rootDir, "../dist");
const mainDts = resolve(distDir, "main.d.ts");
const libMainDts = resolve(distDir, "lib/main.d.ts");

const getExportNames = (entryPath: string): string[] => {
  const program = ts.createProgram([entryPath], {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(entryPath);
  expect(sourceFile).toBeDefined();

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile!);
  expect(moduleSymbol).toBeDefined();

  return checker.getExportsOfModule(moduleSymbol!).map((symbol) => symbol.name);
};

describe("dist type declarations", () => {
  it("should emit a flat dist layout with real declarations at dist/main.d.ts", () => {
    expect(existsSync(mainDts)).toBe(true);
    expect(existsSync(libMainDts)).toBe(false);

    const entryContent = readFileSync(mainDts, "utf-8");
    expect(entryContent.trim()).not.toBe("export {}");
    expect(entryContent.length).toBeGreaterThan(50);
    expect(entryContent).not.toContain("./lib/main");
  });

  it("should expose public API symbols via the package types entry", () => {
    const exportNames = getExportNames(mainDts);

    for (const symbolName of [
      "PortalPage",
      "setRefreshTimer",
      "generateAuthUrl",
      "MemoryStorage",
      "setActiveStorage",
      "switchOrg",
    ]) {
      expect(exportNames).toContain(symbolName);
    }
  });
});
