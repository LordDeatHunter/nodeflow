import { defineConfig } from "vite";
import * as fs from "fs";
import { resolve } from "path";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import dts from "vite-plugin-dts";

const packageJson = JSON.parse(
  fs.readFileSync(resolve(__dirname, "package.json"), "utf-8"),
);

export default defineConfig({
  base: "/nodeflow",
  plugins: [
    cssInjectedByJsPlugin(),
    dts({
      insertTypesEntry: true,
    }),
    // Terminal({ console: "terminal" }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern",
      },
    },
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: packageJson.name,
      fileName: (format) => `nodeflow.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
});
