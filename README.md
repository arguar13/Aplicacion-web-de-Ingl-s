# Tecla

Aprende vocabulario en inglés con una idea simple: aparece una palabra en inglés, suena su pronunciación
y pulsas la tecla con su traducción al español.

Las 3.978 palabras están ordenadas por frecuencia de uso real y agrupadas en 8 niveles de 500.
El repaso espaciado decide qué palabra sale: lo que fallas vuelve a las pocas rondas, lo que aciertas
se aleja en el tiempo (10 min → 1 día → 3 → 7 → 21 → 60 días). El progreso se guarda en el dispositivo.

Dos sentidos, cada uno con su propio progreso: inglés → español (la pronunciación suena al aparecer) y
español → inglés (suena al acertar, para no delatar la respuesta). Las otras tres opciones de cada
ronda son de la misma categoría gramatical que la respuesta, para que no se puedan descartar sin
saber la palabra.

Tras responder aparece la pronunciación en IPA, y la partida puede detenerse para mostrar el detalle
de la palabra: categoría, formas irregulares y una frase de ejemplo con su traducción. Se detiene sola
tras un fallo (configurable: al fallar, siempre o nunca) y con «Ver ejemplo» tras un acierto. Cada
palabra se puede escuchar despacio, sin que cambie el tono de la voz.

Ajustes: pronunciación automática, cuándo detenerse a ver el ejemplo, tema claro/oscuro/automático, copia de seguridad del progreso
(guardar un archivo y restaurarlo, combinando o reemplazando), protección del almacenamiento y
borrar el progreso. En Safari sin instalar, donde los datos se borran tras 7 días sin visitas, un
aviso discreto recuerda guardar una copia.

Cada pantalla tiene su dirección (`#/`, `#/nivel/3`, `#/todas`, `?panel=ajustes`): el botón atrás
del navegador o de Android recorre la app en vez de cerrarla, y los enlaces directos funcionan.

Es una PWA: se instala en Android, iPhone y escritorio y funciona sin conexión desde la primera
visita. La app se guarda entera al primer uso; cada pronunciación se guarda al sonar, y desde
Ajustes se pueden descargar todas (~22 MB). Cuando hay una versión nueva, un aviso deja actualizar
sin cortar la sesión.

## Desarrollo

```bash
npm install          # también instala el hook de pre-commit
npm run dev          # servidor local en http://localhost:5173
npm test             # tests unitarios y de componentes (Vitest)
npm run test:e2e     # tests de extremo a extremo contra el build (Playwright)
npm run lint         # oxlint con análisis de tipos
npm run format       # Prettier
npm run check        # tipos + lint + formato + tests: lo que exige cada commit
npm run build        # typecheck + build de producción en dist/
npm run preview      # sirve dist/ para probar el build
```

La primera vez, los tests e2e necesitan los navegadores: `npx playwright install chromium webkit`.

Calidad: cada commit pasa por `npm run check` (hook de pre-commit con simple-git-hooks) y cada push
por la CI de GitHub Actions (`.github/workflows/ci.yml`): el check, el build y los e2e en Chromium
y WebKit. El linter es oxlint porque typescript-eslint aún no soporta TypeScript 7.

Atajos: `1`–`8` o `0` para elegir nivel · `1`–`4` para responder · `Espacio` para volver a escuchar ·
`L` para escuchar despacio · `E` para ver el ejemplo · `Enter` para seguir · `Esc` para volver a los
niveles.

## Despliegue en Hostinger

El build es un sitio estático: no necesita Node en el servidor.

1. `npm run build`
2. Sube **el contenido** de `dist/` (no la carpeta en sí) a `public_html/`, con el Administrador de
   archivos de hPanel o por FTP. Incluye el archivo oculto `.htaccess`.
3. Listo. Las rutas son relativas, así que también funciona dentro de una subcarpeta
   (p. ej. `public_html/ingles/`).

`public/.htaccess` configura HTTPS, compresión, caché larga para los archivos con hash, revalidación
del HTML, `sw.js` y el manifiesto (para que cada despliegue llegue al instante) y cabeceras de
seguridad. El service worker necesita HTTPS, que Hostinger incluye con su certificado SSL gratuito. Cada MP3 se pide con la versión de su contenido (`audio/<id>.mp3?v=<hash>`, calculada en el build por `vite/audio-versions.ts`), así que se cachea como inmutable: si se regenera un audio, su URL cambia y llega a todos al instante.

## Estructura

```
public/audio/             Pronunciaciones, una por palabra: <id>.mp3
public/.htaccess          Configuración del servidor (Hostinger)
public/icons/             Iconos de la app (normal, maskable para Android y apple-touch-icon)
src/data/words.json       Vocabulario { id, en, es, pos }, ordenado por frecuencia. El id es el nombre del audio.
src/data/details.json     IPA, formas y ejemplo de cada palabra (se carga aparte, en segundo plano)
src/lib/words.ts          Valida el vocabulario al cargarlo
src/lib/decks.ts          Niveles (bloques de 500 palabras) y de dónde salen los distractores
src/lib/details.ts        Detalles de cada palabra: carga diferida, validación y textos
src/lib/scheduler.ts      Repaso espaciado: cajas, intervalos y elección de la siguiente palabra
src/lib/quiz.ts           Opciones de cada ronda (misma categoría, sin sentidos repetidos)
src/lib/store.ts          Almacén en localStorage: versión, migraciones, validación y respaldo
src/lib/progress.ts       Progreso (tarjetas por sentido, días, récord) y cómo combinar dos
src/lib/settings.ts       Ajustes (sentido, pronunciación automática, tema)
src/lib/backup.ts         Copias de seguridad: exportar, validar e importar
src/lib/safekeeping.ts    Última copia, aviso en Safari y almacenamiento persistente
src/lib/routes.ts         Rutas (hash) y su conversión a URL
src/lib/router.ts         Historial del navegador: navegar, volver atrás, useRoute()
src/lib/audio.ts          Reproducción con Web Audio (con alternativa <audio> donde no existe)
src/lib/audioUrl.ts       URL de cada pronunciación con la versión de su contenido
src/lib/pwa.ts            Instalación, audio sin conexión y limpieza de versiones antiguas
src/lib/theme.ts          Aplica el tema; index.html lo fija antes de pintar para evitar destellos
src/hooks/                Estado de la partida, resúmenes de mazos, teclado
src/components/           Pantallas y piezas de la app
src/components/ui/        Componentes base: Button, IconButton, Badge, Surface, Sheet, Toast…
src/index.css             Sistema visual: paleta clara/oscura (AA), tipografías, animaciones
vite/audio-versions.ts    Plugin de Vite: hash de cada MP3 para versionar sus URLs
e2e/                      Tests de extremo a extremo (Playwright)
scripts/rank_words.py     Reordena words.json por frecuencia (pip install wordfreq)
scripts/tag_pos.py        Categoría gramatical de cada palabra (pip install nltk)
scripts/enrich_words.py   Genera details.json: IPA, formas irregulares y ejemplos
scripts/data/examples/    Frases de ejemplo por nivel (fuente de details.json)
scripts/generate_audio.py Genera el audio de las palabras que no lo tengan (pip install gtts)
```

Stack: Vite, React 19, TypeScript 7, Tailwind CSS 4, vite-plugin-pwa (Workbox). Calidad: Vitest,
Testing Library, Playwright, axe, oxlint y Prettier.

## Agregar palabras

1. Añade `{ "id", "en", "es" }` a `src/data/words.json` (el id en minúsculas, con guiones).
2. `python scripts/generate_audio.py` crea su audio con la misma voz que el resto.
3. `python scripts/tag_pos.py --report` asigna la categoría gramatical (`pos`) y lista los casos
   dudosos; las correcciones van en `POS_OVERRIDES` (pip install nltk; usa WordNet en inglés y
   español).
4. `python scripts/rank_words.py` las recoloca por frecuencia.
5. `npm test` comprueba que los ids sean únicos, que cada palabra tenga audio y categoría.

Las traducciones siguen estas reglas: español latinoamericano neutro, el sentido más común primero,
como mucho dos sentidos separados por coma y en minúscula salvo nombres propios. Dos palabras que
comparten un sentido nunca salen juntas como opciones (ver `senses()` en `src/lib/quiz.ts`), y los
distractores son de la misma categoría gramatical que la respuesta: la traducción de un verbo
compite con otros verbos, no con sustantivos que se descartarían sin saber la palabra.

## Datos y licencias

- Frecuencias: [wordfreq](https://github.com/rspeer/wordfreq) (Apache 2.0; datos CC BY-SA 4.0).
- Pronunciación: [CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict)
  (BSD de 2 cláusulas), convertido a IPA por `scripts/enrich_words.py`.
- Categorías y plurales irregulares: [WordNet](https://wordnet.princeton.edu/) (licencia WordNet 3.0)
  y [Open Multilingual Wordnet](https://omwn.org/) para el español.
- Traducciones, frases de ejemplo y verbos irregulares: propios del proyecto.
- Audio: gTTS (voz de Google Translate).

Para regenerar los detalles tras cambiar el vocabulario: `python scripts/enrich_words.py` (las
palabras nuevas necesitan antes su frase en `scripts/data/examples/level-N.json`; `npm test`
comprueba que ninguna falte y que cada frase contenga su palabra).
