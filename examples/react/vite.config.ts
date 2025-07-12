import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'web-eye-tracking-recorder': '/../../src/index.ts',
      '@web-eye-tracking-recorder/react': '/../../packages/react/index.ts'
    }
  }
})