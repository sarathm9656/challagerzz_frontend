import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://challagerzz-backend.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/api': {
        target: 'https://challagerzz-backend.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
