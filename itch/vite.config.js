// Standalone build for itch.io: one index.html with the game, React and
// styles inlined, so it runs from any host inside an iframe.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
export default defineConfig({
  root,
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production"), __STANDALONE__: "true" },
  build: {
    outDir: fileURLToPath(new URL("./build", import.meta.url)),
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: { entry: root + "src/mayor/main.jsx", formats: ["iife"], name: "LionCityMayor", fileName: () => "game.js" },
    rollupOptions: { output: { assetFileNames: "game.[ext]" } },
  },
});
