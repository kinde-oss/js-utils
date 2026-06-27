import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      entry: resolve(rootDir, "lib/expo.ts"),
      formats: ["es", "cjs"],
      name: "KindeJsUtilsExpo",
      fileName: "expo",
    },
    target: "esnext",
    outDir: "dist",
    emptyOutDir: false,
    rolldownOptions: {
      external: ["expo-secure-store"],
      output: {
        codeSplitting: false,
      },
    },
  },
  resolve: { alias: { src: resolve(rootDir, "./lib") } },
  plugins: [
    dts({
      outDir: "dist",
      entryRoot: "lib",
      include: ["lib/expo.ts"],
    }),
  ],
});
