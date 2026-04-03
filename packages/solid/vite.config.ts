import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [solidPlugin(), dts({ insertTypesEntry: true })],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "@nodeflow/solid",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "solid-js",
        "solid-js/web",
        "solid-js/store",
        "@nodeflow/core",
      ],
      output: {
        exports: "named",
        globals: {
          "solid-js": "solid",
          "solid-js/web": "solidWeb",
          "solid-js/store": "solidStore",
        },
      },
    },
  },
});
