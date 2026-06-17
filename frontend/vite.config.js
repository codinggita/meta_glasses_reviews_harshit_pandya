import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:5000',
      '/jwt': 'http://localhost:5000',
      '/reviews': 'http://localhost:5000',
      '/stats': 'http://localhost:5000',
      '/profile': 'http://localhost:5000',
      '/countries': 'http://localhost:5000',
      '/ratings': 'http://localhost:5000',
      '/search': 'http://localhost:5000',
      '/compare': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
      '/version': 'http://localhost:5000'
    }
  },
  build: {
    outDir: '../backend/public',
    emptyOutDir: true
  }
})

