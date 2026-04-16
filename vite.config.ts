import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base avoids broken asset paths across different Pages URL setups.
  base: './',
  plugins: [react()],
})
