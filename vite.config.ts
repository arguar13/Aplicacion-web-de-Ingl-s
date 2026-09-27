import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { audioVersions } from './vite/audio-versions.ts'

export default defineConfig({
  // Rutas relativas: el build funciona igual en la raíz del dominio que en una subcarpeta de public_html.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    audioVersions(fileURLToPath(new URL('./public/audio', import.meta.url))),
    VitePWA({
      // El usuario decide cuándo actualizar: recargar a mitad de una sesión sería molesto.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Tecla · Vocabulario en inglés',
        short_name: 'Tecla',
        description: 'Escucha la palabra en inglés y pulsa la tecla con su traducción.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4f1ea',
        theme_color: '#4338ca',
        categories: ['education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // La app completa queda disponible sin conexión. De las fuentes, solo los alfabetos latinos.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', 'assets/*latin*.woff2'],
        globIgnores: ['audio/**'],
        navigateFallback: 'index.html',
        // Controla la página desde la primera visita (si no, hasta recargar no se guardaría ningún
        // audio ni se podría descargar para usar sin conexión). Las actualizaciones siguen esperando
        // a que el usuario las acepte: no hay skipWaiting.
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Cada pronunciación se guarda la primera vez que suena (o al descargarlas todas en Ajustes).
            urlPattern: ({ url }) => url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'tecla-audio',
              cacheableResponse: { statuses: [200] },
              // La URL lleva ?v=<hash del contenido>: cada versión es una entrada distinta y las
              // antiguas se borran desde la app (pruneStaleAudio).
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // e2e/ lo ejecuta Playwright (npm run test:e2e).
    include: ['src/**/*.test.{ts,tsx}', 'vite/**/*.test.ts'],
  },
})
