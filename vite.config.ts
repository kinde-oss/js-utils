import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, "lib/main.ts"),
      formats: ["es", "cjs"],
      name: "@kinde/js-utils",
      fileName: "js-utils",
    },
    target: "esnext",
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["react", "react-native"],
    },
  },
  root: "lib",
  base: "",
  resolve: { alias: { src: resolve(__dirname, "./lib") } },
  plugins: [dts({ insertTypesEntry: true, outDir: "../dist" }), react()],
});
