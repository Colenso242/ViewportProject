import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// NOTE: We intentionally do NOT set Cross-Origin-Opener/Embedder-Policy here.
// Those headers make the page cross-origin isolated, which makes web-ifc load
// its multithreaded wasm (web-ifc-mt.wasm). That build's pthread bootstrap
// fetches `web-ifc-mt.worker.js`, which web-ifc@0.0.39 does not ship — the
// request 404s and IFC parsing hangs forever. Without isolation, web-ifc falls
// back to the single-threaded web-ifc.wasm (which is present) and IFC loads
// reliably. Parsing still runs off the main thread via web-ifc-three's
// IFCWorker.js, so the UI stays responsive.
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // Fail loudly if 5173 is taken instead of silently climbing to 5174, 5175…
    // The backend pins CORS/Socket.IO to http://localhost:5173, so a different
    // port would break the API + live data with no obvious cause.
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  optimizeDeps: {
    exclude: ['web-ifc-three', 'web-ifc']
  }
});
