import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/web',
  publicDir: '../../static',
  plugins: [react()],
  build: { outDir: '../../dist', emptyOutDir: true, chunkSizeWarningLimit: 800 },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
});
