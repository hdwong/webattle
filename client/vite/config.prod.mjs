import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineConfig({
  base: './',
  plugins: [ react() ],
  logLevel: 'warning',
  css: {
    modules: {
      generateScopedName: `${packageJson.name}-[hash:6]`,
    },
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: [ 'phaser' ],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
  },
});
