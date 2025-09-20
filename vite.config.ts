import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/input-box/" : "/",
  optimizeDeps: {
    include: ["lit"],
  },
  server: {
    hmr: true,
  },
}));
