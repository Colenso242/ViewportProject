import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// COOP/COEP make the page cross-origin isolated, which unlocks
// SharedArrayBuffer so web-ifc can use its multithreaded wasm build.
const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    headers: crossOriginIsolationHeaders,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  preview: {
    headers: crossOriginIsolationHeaders
  },
  optimizeDeps: {
    exclude: ['web-ifc-three', 'web-ifc']
  }
});
