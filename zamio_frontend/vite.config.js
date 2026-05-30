import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load Vite env files (e.g., .env, .env.local) so we can read VITE_* values here
  const env = loadEnv(mode, process.cwd(), '')
  // Prefer real env (e.g., from Docker Compose), then .env files, then fallback
  const target = process.env.VITE_API_URL || env.VITE_API_URL || 'http://localhost:8000'
  const { hostname } = new URL(target)
  const changeOrigin = !hostname.includes('_')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      watch: {
        usePolling: true,
        interval: 1000,
      },
      hmr: {
        overlay: false,
      },
      proxy: {
        '/api': { target, changeOrigin, secure: false },
        '/media': { target, changeOrigin, secure: false },
      },
    },
    optimizeDeps: {
      exclude: ['fsevents'],
    },
  }
})
