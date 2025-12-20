
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Jika Anda menggunakan GitHub Pages (misal: username.github.io/dashboard-repd/)
// Ubah base menjadi '/dashboard-repd/'
// Jika menggunakan Vercel atau domain utama, biarkan '/'

export default defineConfig({
  plugins: [react()],
  base: './', // Menggunakan relative path agar fleksibel di berbagai hosting gratis
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  }
})
