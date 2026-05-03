import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ['@repo/shared'],
  },
  build: {
    commonjsOptions: {
      // @repo/shared est compilé en CJS et utilise __exportStar pour les barrels
      // Cette option permet à Rollup de détecter les enums (valeurs) re-exportés.
      include: [/node_modules/, /packages\/shared/],
      transformMixedEsModules: true,
    },
  },
});
