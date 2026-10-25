import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se reenvía al backend para evitar problemas de CORS y no
// tener que escribir la URL completa en el código.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_BACKEND_URL ?? 'http://localhost:3000',
    },
  },
});
