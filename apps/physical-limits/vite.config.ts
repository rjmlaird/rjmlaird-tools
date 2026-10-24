import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative asset paths and flat output
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});