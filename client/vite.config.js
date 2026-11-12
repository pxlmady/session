import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Запити до /api у режимі розробки перенаправляються на серверну частину.
// VITE_API_PROXY задає іншу адресу сервера (e2e-тести запускають окремий сервер, каталог e2e/).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_PROXY || 'http://localhost:3000',
    },
  },
});
