import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  base: "/mathquizSGPrimary/",
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        colorvision: fileURLToPath(new URL("./colorvision.html", import.meta.url)),
      },
    },
  },
});
