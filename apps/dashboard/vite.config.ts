import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@resqnet/shared-types': path.resolve(__dirname, '../../packages/shared-types/index.ts'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname), path.resolve(__dirname, '../../packages')],
    },
  },
})
