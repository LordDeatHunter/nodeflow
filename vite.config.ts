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
});
