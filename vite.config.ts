import { defineConfig } from "vitest/config";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import react from "@vitejs/plugin-react";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, "lib/main.ts"),
      formats: ["es", "cjs"],
      name: "@kinde/js-utils",
      fileName: "js-utils",
    },
    target: "esnext",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["expo-secure-store", "/src/tests/**"],
    },
  },
  root: "",
  base: "lib",
  resolve: { alias: { src: resolve(__dirname, "./lib") } },
  plugins: [dts({ insertTypesEntry: true, outDir: "dist" }), react()],
});
