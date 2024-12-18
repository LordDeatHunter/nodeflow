import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import * as fs from "fs";
import { resolve } from "path";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import dts from "vite-plugin-dts";

// import devtools from 'solid-devtools/vite';
const packageJson = JSON.parse(
  fs.readFileSync(resolve(__dirname, "package.json"), "utf-8"),
);

export default defineConfig({
  base: "/nodeflow",
  plugins: [
    // Uncomment the following line to enable solid-devtools. https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    // devtools(),
    solidPlugin(),
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
      external: ["solid-js", "solid-js/web", "solid-js/store"],
      output: {
        exports: "named",
        globals: {
          "solid-js": "solid",
          "solid-js/web": "solidWeb",
          "solid-js/store": "solidStore",
        }
      },
    },
  },
});
