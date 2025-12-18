import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Use environment variable for API URL (supports Docker and local dev)
const API_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow LAN access
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/graphql': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});


