import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    outDir: 'dist'
  },
  server: {
    // ✅ Fix for React Router refresh issue in dev
    historyApiFallback: true
  },
  preview: {
    // ✅ Fix for React Router refresh issue in production preview
    historyApiFallback: true
  }
})
