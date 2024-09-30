import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [ react() ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  server: {
    port: 8080,
  },
  resolve: {
    alias: {
      '@': '/src',
      'res': '/src/assets',
      'css': '/src/assets/css',
      'img': '/src/assets/img',
      'com': '/src/components',
      'utils': '/src/utils',
    },
  },
});
