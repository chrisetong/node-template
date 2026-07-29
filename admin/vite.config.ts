import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const defaultBase = command === "build" ? "/admin/" : "/"

  return {
    base: normalizeAppBase(env.VITE_APP_BASE || defaultBase),
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  }
})

function normalizeAppBase(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === "/") return "/"
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`
}
