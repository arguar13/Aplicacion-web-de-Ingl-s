# Tecla

Aprende vocabulario en inglés con una idea simple: aparece una palabra en inglés, suena su pronunciación
y pulsas la tecla con su traducción al español.

Las 3.978 palabras están ordenadas por frecuencia de uso real y agrupadas en 8 niveles de 500.
El repaso espaciado decide qué palabra sale: lo que fallas vuelve a las pocas rondas, lo que aciertas
se aleja en el tiempo (10 min → 1 día → 3 → 7 → 21 → 60 días). El progreso se guarda en el dispositivo.

Dos sentidos, cada uno con su propio progreso: inglés → español (la pronunciación suena al aparecer) y
español → inglés (suena al acertar, para no delatar la respuesta). Ajustes: pronunciación automática,
tema claro/oscuro/automático y borrar el progreso.

Es una PWA: se instala en Android, iPhone y escritorio y funciona sin conexión. La app se guarda
entera al primer uso; cada pronunciación se guarda al sonar, y desde Ajustes se pueden descargar
todas (~22 MB). Cuando hay una versión nueva, un aviso deja actualizar sin cortar la sesión.

## Desarrollo

```bash
npm install
npm run dev        # servidor local en http://localhost:5173
npm test           # tests unitarios (Vitest)
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve dist/ para probar el build
```

Atajos: `1`–`8` o `0` para elegir nivel · `1`–`4` para responder · `Espacio` para volver a escuchar ·
`Esc` para volver a los niveles.

## Despliegue en Hostinger

El build es un sitio estático: no necesita Node en el servidor.

1. `npm run build`
2. Sube **el contenido** de `dist/` (no la carpeta en sí) a `public_html/`, con el Administrador de
   archivos de hPanel o por FTP. Incluye el archivo oculto `.htaccess`.
3. Listo. Las rutas son relativas, así que también funciona dentro de una subcarpeta
   (p. ej. `public_html/ingles/`).

`public/.htaccess` configura HTTPS, compresión, caché larga para los archivos con hash, revalidación
del HTML, `sw.js` y el manifiesto (para que cada despliegue llegue al instante) y cabeceras de
seguridad. El service worker necesita HTTPS, que Hostinger incluye con su certificado SSL gratuito. Los MP3 se cachean 30 días: si se regenera un audio, cámbiale el nombre o espera ese plazo.

## Estructura

```
public/audio/           Pronunciaciones, una por palabra: <id>.mp3
public/.htaccess        Configuración del servidor (Hostinger)
src/data/words.json     Vocabulario { id, en, es }, ordenado por frecuencia. El id es el nombre del audio.
src/lib/decks.ts        Niveles: bloques de 500 palabras sobre ese orden
src/lib/scheduler.ts    Repaso espaciado: cajas, intervalos y elección de la siguiente palabra
src/lib/store.ts        Almacén genérico en localStorage con suscripción para React
src/lib/progress.ts     Progreso (tarjetas por sentido, racha de días, récord)
src/lib/settings.ts     Ajustes (sentido, pronunciación automática, tema)
src/lib/theme.ts        Aplica el tema; index.html lo fija antes de pintar para evitar destellos
src/lib/quiz.ts         Opciones de cada ronda (distractores sin traducciones repetidas)
src/lib/audio.ts        Reproducción con Web Audio (funciona en iPhone/iPad sin tocar cada vez)
src/lib/pwa.ts          Instalación como app y descarga del audio para usarlo sin conexión
public/icons/           Iconos de la app (normal, maskable para Android y apple-touch-icon)
src/hooks/              Estado de la partida y teclado
src/components/         Interfaz
src/index.css           Sistema visual: paleta clara/oscura, tipografías, animaciones
scripts/rank_words.py   Reordena words.json por frecuencia (pip install wordfreq)
scripts/generate_audio.py  Genera el audio de las palabras que no lo tengan (pip install gtts)
```

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, vite-plugin-pwa (Workbox).

## Agregar palabras

1. Añade `{ "id", "en", "es" }` a `src/data/words.json` (el id en minúsculas, con guiones).
2. `python scripts/generate_audio.py` crea su audio con la misma voz que el resto.
3. `python scripts/rank_words.py` las recoloca por frecuencia.
4. `npm test` comprueba que los ids sean únicos y que cada palabra tenga audio.

Las traducciones siguen estas reglas: español latinoamericano neutro, el sentido más común primero,
como mucho dos sentidos separados por coma y en minúscula salvo nombres propios. Dos palabras que
comparten un sentido nunca salen juntas como opciones (ver `senses()` en `src/lib/quiz.ts`).
