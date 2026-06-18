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
      entry: resolve(rootDir, "lib/main.ts"),
      formats: ["es", "cjs"],
      name: "@kinde/js-utils",
      fileName: "js-utils",
    },
    target: "esnext",
    outDir: "dist",
    emptyOutDir: true,
    rolldownOptions: {
      external: ["expo-secure-store", "/src/tests/**"],
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
