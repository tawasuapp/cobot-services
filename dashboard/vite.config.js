import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://13.212.204.12:3000',
      '/socket.io': {
        target: 'http://13.212.204.12:3000',
        ws: true,
      },
    },
  },
})
