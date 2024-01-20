import { resolve } from "path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import eslint from "vite-plugin-eslint";
// import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [
    // Uncomment the following line to enable solid-devtools. https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    // devtools(),
    eslint(),
    solidPlugin(),
    // Terminal({ console: "terminal" }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "NodeFlow",
      fileName: "nodeflow",
    },
    rollupOptions: {
      external: [
        "solid-js",
        "solid-js/web",
        "solid-js/store",
        "@solid-primitives/map",
      ],
      output: {
        globals: {
          "solid-js": "Solid",
          "solid-js/web": "SolidWeb",
          "solid-js/store": "SolidStore",
          "@solid-primitives/map": "SolidPrimitivesMap",
        },
      },
    },
  },
});
