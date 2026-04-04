import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function emitStyleCss() {
  return {
    name: "emit-style-css",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "style.css",
        source: readFileSync(resolve(process.cwd(), "src/style.css"), "utf8"),
      });
    },
  };
}

export default defineConfig({
  plugins: [dts({ insertTypesEntry: true }), emitStyleCss()],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "@nodeflow/core",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      output: { exports: "named" },
    },
  },
});
