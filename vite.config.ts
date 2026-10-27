/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // With VITE_USE_MOCKS=false the SPA calls /api, served by the AdonisJS app in server/.
  // Proxying keeps it same-origin, so the session cookie and the realtime stream just work,
  // including from a phone on the same Wi-Fi (`npm run dev:lan`).
  server: {
    // The API reloads itself; its file changes must not reload the SPA.
    watch: { ignored: ['**/server/**'] },
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3333', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
    restoreMocks: true,
    // Tests always run on the in-browser mock data, even when .env.local points the app at server/.
    env: { VITE_USE_MOCKS: 'true' },
    // The journey tests (sign-up → booking) take ~4.5s and timed out at the 5s default on a busy machine.
    testTimeout: 15_000,
  },
})
