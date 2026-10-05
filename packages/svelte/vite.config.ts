import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte(), dts({ insertTypesEntry: true })],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "@nodeflow-lib/svelte",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: (id) =>
        id === "svelte" ||
        id.startsWith("svelte/") ||
        id.startsWith("@nodeflow-lib/"),
      output: { exports: "named" },
    },
  },
});
