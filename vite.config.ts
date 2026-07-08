import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// poe.ninja does not send CORS headers, so the SPA calls /poe-api/* and the
// dev/preview server forwards it. In a real deployment the static host needs
// an equivalent rewrite (e.g. nginx location, Netlify redirect).
const poeProxy = {
  '/poe-api': {
    target: 'https://poe.ninja',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/poe-api/, ''),
    headers: { 'User-Agent': 'Mozilla/5.0 (currency-conversion-app)' },
  },
  // Item icons live on GGG's CDN, not on poe.ninja itself
  '/poe-img': {
    target: 'https://web.poecdn.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/poe-img/, ''),
    headers: { 'User-Agent': 'Mozilla/5.0 (currency-conversion-app)' },
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: poeProxy },
  preview: { proxy: poeProxy },
})
