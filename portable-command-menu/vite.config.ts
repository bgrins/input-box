import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'command-menu.ts',
      name: 'CommandMenu',
      fileName: 'command-menu'
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  },
  server: {
    open: '/demo.html'
  }
});