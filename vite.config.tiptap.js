import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/tiptap-bundle.js"),
      name: "TiptapBundle",
      formats: ["es"],
      fileName: "tiptap-bundle",
    },
    outDir: "dist-tiptap",
    rollupOptions: {
      output: {
        format: "es",
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
    minify: false,
    sourcemap: false,
  },
});
