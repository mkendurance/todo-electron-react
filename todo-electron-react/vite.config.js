import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',        // Required: Electron loads from file://, so paths must be relative
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
