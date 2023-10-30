import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import eslint from "vite-plugin-eslint";

export default defineConfig({
  plugins: [eslint(), solidPlugin()],
  build: {
    target: "esnext",
  },
  server: {
    port: 3001,
  },
});
