import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'https://admin.cobot.qa',
      '/socket.io': {
        target: 'https://admin.cobot.qa',
        ws: true,
      },
    },
  },
})
