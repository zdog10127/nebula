import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Route-level code-splitting (see App.tsx) already keeps these out of the initial
        // load; grouping them into their own named vendor chunks on top of that means the
        // browser/Electron cache keys each library separately — a change to app code doesn't
        // force livekit-client's ~sizable bundle to be re-downloaded, and the voice/video
        // chunk stays a single fetch instead of interleaved with unrelated app code.
        manualChunks(id) {
          if (id.includes('node_modules/livekit-client')) return 'vendor-livekit'
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/@microsoft/signalr')) return 'vendor-signalr'
          if (id.includes('node_modules/react-colorful')) return 'vendor-colorpicker'
        },
      },
    },
  },
})
