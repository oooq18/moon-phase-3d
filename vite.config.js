import { defineConfig } from 'vite';

// Project site: https://oooq18.github.io/moon-phase-3d/
export default defineConfig({
  base: '/moon-phase-3d/',
  server: {
    host: '0.0.0.0',
    port: 47321,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 47321,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 800,
  },
});
