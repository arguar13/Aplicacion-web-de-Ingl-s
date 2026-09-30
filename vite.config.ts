import { readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { audioVersions } from './vite/audio-versions.ts'
import { siteMeta } from './vite/site-meta.ts'
import { startupPreload } from './vite/startup-preload.ts'
import { vocabularyAsset } from './vite/vocabulary.ts'
import pkg from './package.json' with { type: 'json' }

const AUDIO_DIR = fileURLToPath(new URL('./public/audio', import.meta.url))
/** Megas de todas las pronunciaciones: lo que cuesta descargarlas para estudiar sin conexión. */
const audioMegabytes = Math.max(
  1,
  Math.round(readdirSync(AUDIO_DIR).reduce((sum, file) => sum + statSync(`${AUDIO_DIR}/${file}`).size, 0) / 1e6),
)

export default defineConfig({
  define: {
    'import.meta.env.AUDIO_MB': JSON.stringify(audioMegabytes),
    // Versión de package.json, visible al pie de Ajustes (útil cuando alguien cuenta un problema).
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version),
  },
  // Rutas relativas: el build funciona igual en la raíz del dominio que en una subcarpeta de public_html.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    audioVersions(AUDIO_DIR),
    siteMeta(),
    startupPreload(),
    vocabularyAsset(fileURLToPath(new URL('./src/data/words.json', import.meta.url))),
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
        background_color: '#f6f6f9',
        theme_color: '#4f46e5',
        categories: ['education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Instalación enriquecida (Chrome y Edge). Se regeneran con `npm run capture`.
        screenshots: [
          {
            src: 'screenshots/partida-movil.png',
            sizes: '824x1830',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Una palabra en inglés y cuatro teclas con traducciones',
          },
          {
            src: 'screenshots/inicio-movil.png',
            sizes: '824x1830',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Inicio: modos de práctica, nivel en curso y repaso del día',
          },
          {
            src: 'screenshots/inicio-escritorio.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Tecla en el escritorio',
          },
        ],
      },
      workbox: {
        // La app completa queda disponible sin conexión. De las fuentes, solo los alfabetos latinos.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', 'assets/*.json', 'assets/*latin*.woff2'],
        // Las capturas y la imagen para compartir no hacen falta para usar la app.
        globIgnores: ['audio/**', 'screenshots/**', 'og.png'],
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
    // El vocabulario se fija antes de cada archivo (en la app lo carga main.tsx).
    setupFiles: ['src/test/vocabulary.ts'],
    // e2e/ lo ejecuta Playwright (npm run test:e2e).
    include: ['src/**/*.test.{ts,tsx}', 'vite/**/*.test.ts'],
  },
})
