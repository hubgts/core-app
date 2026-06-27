import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // écoute sur 0.0.0.0 (nécessaire dans Docker)
    port: 5173,
  },
});
