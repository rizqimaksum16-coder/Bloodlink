import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Paksa Vite listen di semua interface (IPv4 & IPv6)
    // Sehingga Nmap dan tools monitoring bisa mendeteksi port 5173 di 127.0.0.1
    host: '0.0.0.0',
    port: 5173,
    watch: {
      ignored: ['**/backend/**', '**/venv/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Naikkan batas warning chunk size agar log lebih bersih
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Pisahkan vendor libraries ke chunk terpisah agar browser bisa cache lebih lama
        manualChunks: (id) => {
          // Supabase client → chunk sendiri
          if (id.includes('@supabase')) return 'supabase';
          // Recharts + d3 + lodash → hanya di-load saat dashboard dibuka
          if (id.includes('recharts') || id.includes('d3-') || id.includes('lodash') || id.includes('d3shape') || id.includes('recharts-scale')) return 'charts';
          // Leaflet (maps) → chunk sendiri
          if (id.includes('leaflet')) return 'leaflet';
          // Radix UI components
          if (id.includes('@radix-ui')) return 'radix';
          // QR code library
          if (id.includes('qr-scanner') || id.includes('qrcode') || id.includes('jsqr') || id.includes('zxing')) return 'qrcode';
          // React core → chunk tersendiri
          if (id.includes('react-dom') || id.includes('react/')) return 'react';
          // React Router
          if (id.includes('react-router')) return 'router';
        },
      },
    },
  },
})

