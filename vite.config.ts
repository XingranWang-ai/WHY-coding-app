import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/leaderboard-api': {
        target: 'https://jsonblob.com',
        changeOrigin: true,
        rewrite: () =>
          '/api/jsonBlob/019eb5a7-bb37-780c-b384-6060c0f5bf43',
      },
      '/version-api': {
        target: 'https://jsonblob.com',
        changeOrigin: true,
        rewrite: () =>
          '/api/jsonBlob/019eb649-ab99-72ca-bf7c-6381c3d8f66b',
      },
    },
  },
})
