import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at tools.rjmlaird.co.uk/carbon-reduction-plan/. The output folder carries the prefix so
// Workers Static Assets finds /carbon-reduction-plan/... paths without a Worker script.
export default defineConfig({
  plugins: [react()],
  base: '/carbon-reduction-plan/',
  build: {
    outDir: 'dist/carbon-reduction-plan',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
  },
})
