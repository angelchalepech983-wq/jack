import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración optimizada para GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
})
