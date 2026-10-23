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
        ai: fileURLToPath(new URL("./ai.html", import.meta.url)),
        city: fileURLToPath(new URL("./city.html", import.meta.url)),
        mayor: fileURLToPath(new URL("./mayor.html", import.meta.url)),
        dicechess: fileURLToPath(new URL("./dicechess.html", import.meta.url)),
      },
    },
  },
});
