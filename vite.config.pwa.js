import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PWA-specific Vite config — standalone web build, no Electron dependencies
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      // Exclude electron-specific modules from the bundle
      external: ['electron'],
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    https: false, // localhost is secure context for Web Bluetooth
  },
  preview: {
    port: 5174,
    strictPort: true,
  },
})
