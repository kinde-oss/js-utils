import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import ts from "typescript";

const distDir = resolve(import.meta.dirname, "../dist");
const mainDts = resolve(distDir, "main.d.ts");
const libMainDts = resolve(distDir, "lib/main.d.ts");

describe("dist type declarations", () => {
  it("should expose PortalPage via the package types entry", () => {
    expect(existsSync(mainDts)).toBe(true);
    expect(existsSync(libMainDts)).toBe(true);

    const entryContent = readFileSync(mainDts, "utf-8");
    expect(entryContent).toContain("./lib/main");

    const program = ts.createProgram([mainDts], {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      skipLibCheck: true,
    });
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(mainDts);
    expect(sourceFile).toBeDefined();

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile!);
    expect(moduleSymbol).toBeDefined();

    const exports = checker.getExportsOfModule(moduleSymbol!);
    const portalPage = exports.find((symbol) => symbol.name === "PortalPage");
    expect(portalPage).toBeDefined();
  });
});
