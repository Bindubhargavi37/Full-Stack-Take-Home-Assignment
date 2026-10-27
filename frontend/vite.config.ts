import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Keep Vite's dependency cache out of the project folder: cloud-synced folders
  // (e.g. OneDrive) can lock it and stop the dev server from starting.
  cacheDir: join(tmpdir(), 'forms-dashboard', 'vite'),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // In development the browser talks only to Vite; Vite forwards /api to Express.
    // Same origin means cookies just work, with no CORS setup in the browser.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
