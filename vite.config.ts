import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import eslint from "vite-plugin-eslint";
import * as fs from "fs";
import { resolve } from "path";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

// import devtools from 'solid-devtools/vite';
const packageJson = JSON.parse(
  fs.readFileSync(resolve(__dirname, "package.json"), "utf-8"),
);

export default defineConfig({
  base: "/nodeflow",
  plugins: [
    // Uncomment the following line to enable solid-devtools. https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    // devtools(),
    eslint(),
    solidPlugin(),
    cssInjectedByJsPlugin(),
    // Terminal({ console: "terminal" }),
  ],
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
