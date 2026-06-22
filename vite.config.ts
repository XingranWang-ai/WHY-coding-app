import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/sync-api': {
          target: env.VITE_SYNC_API_URL ?? 'http://127.0.0.1:8787',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/sync-api/, ''),
        },
      },
    },
  }
})
