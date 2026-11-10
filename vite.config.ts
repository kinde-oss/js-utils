import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";
import react from "@vitejs/plugin-react";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  build: {
    copyPublicDir: false,
    lib: {
      entry: {
        "js-utils": resolve(rootDir, "lib/main.ts"),
        agents: resolve(rootDir, "lib/agents/index.ts"),
      },
      formats: ["es", "cjs"],
      name: "@kinde/js-utils",
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    target: "esnext",
    outDir: "dist",
    emptyOutDir: true,
    rolldownOptions: {
      external: ["/src/tests/**"],
    },
  },
  root: "",
  resolve: { alias: { src: resolve(rootDir, "./lib") } },
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: "dist",
      entryRoot: "lib",
    }),
    react(),
  ],
});
