import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The static build reads pre-generated tales from public/tales.
// `npm run live` adds a local retelling API on 8790 for the "retell again" control.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:8790' } },
});
