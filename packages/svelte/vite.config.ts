import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte(), dts({ insertTypesEntry: true })],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "@nodeflow/svelte",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "svelte",
        "svelte/internal",
        "@nodeflow/vanilla",
        "@nodeflow/core",
      ],
      output: { exports: "named" },
    },
  },
});
