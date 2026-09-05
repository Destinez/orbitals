import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: {
    target: 'es2022',
    // The ogl shader layer is the heaviest single dep. It is kept out of
    // the entry chunk by lazy-importing GalaxyField, not by a manual
    // chunk map — Vite 8 / rolldown wants a function there anyway.
  },
});
