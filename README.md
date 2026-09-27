# Tecla

Aprende vocabulario en inglés con una idea simple: aparece una palabra en inglés, suena su pronunciación
y pulsas la tecla con su traducción al español.

Las 3.978 palabras están ordenadas por frecuencia de uso real y agrupadas en 8 niveles de 500.
El repaso espaciado usa FSRS: cada palabra tiene su propia estabilidad y dificultad, y vuelve cuando la
probabilidad de recordarla baja al 90 %. Lo que fallas vuelve a las pocas rondas; lo que aciertas se
aleja, más cuanto más rápido respondes. El progreso se guarda en el dispositivo.

Cada día tiene una meta (10, 20, 40 o 60 palabras) y un límite de palabras nuevas. Al cumplir la meta,
o al salir de una partida, un resumen muestra palabras, precisión, nuevas, mejor racha y las palabras
falladas. En el inicio, el **repaso del día** reúne lo que toca repasar de todos los niveles (con la
previsión de la semana) y **Mis difíciles** junta las palabras que más se olvidan.

Cinco formas de practicar, elegidas en el inicio: **traducir** (inglés → español; la pronunciación
suena al aparecer), **inverso** (español → inglés; suena al acertar para no delatar la respuesta),
**escuchar** (solo el audio), **escribir** (la palabra inglesa con el teclado; un error de tecleo es
"¡casi!" con la corrección letra por letra) y **completar** (la frase de ejemplo con un hueco).
Escuchar y escribir tienen progreso propio; completar refuerza el de traducir. Las otras opciones de
cada ronda son de la misma categoría gramatical que la respuesta, para que no se puedan descartar sin
saber la palabra. **Relámpago** es un juego aparte: 60 segundos con palabras ya vistas y récord
personal.

Tras responder aparece la pronunciación en IPA, y la partida puede detenerse para mostrar el detalle
de la palabra: categoría, formas irregulares y una frase de ejemplo con su traducción. Se detiene sola
tras un fallo (configurable: al fallar, siempre o nunca) y con «Ver ejemplo» tras un acierto. Cada
palabra se puede escuchar despacio, sin que cambie el tono de la voz.

**Tu progreso** (#/estadisticas) muestra racha, tiempo, precisión, un mapa de calor de actividad, la
evolución de las palabras dominadas y el avance por nivel en cada habilidad. El **diccionario**
(#/diccionario) busca en inglés y español entre las 3.978 palabras y abre la ficha de cada una:
pronunciación, ejemplo, progreso por habilidad, últimas respuestas, favorita y "ya la sé".

La primera vez, una bienvenida de tres pasos (saltable) explica la idea, pide una meta diaria y
ofrece una **prueba de nivel** de un minuto: recomienda por dónde empezar y marca como sabidas las
palabras acertadas. **Trece logros** con medallas propias (primera sesión, rachas de 7 y 30 días,
100/500/1.000 dominadas, nivel completado, sesión perfecta…) se anuncian al conseguirlos y se
exhiben en Tu progreso. Cada 7 días con la meta cumplida se gana un **protector de racha** (hasta 2)
que cubre un día sin práctica, y un aviso en el inicio indica cuando la racha está en riesgo. Las
celebraciones son proporcionales: un sonido suave al acertar, confeti al cumplir la meta, más al
completar un nivel; nada se mueve si el sistema pide reducir movimiento.

Ajustes, por secciones: **práctica** (meta diaria, palabras nuevas por día, cuándo detenerse a ver
el ejemplo, pronunciación automática), **sonido** (efectos y vibración), **apariencia** (tema
claro, oscuro o automático), **recordatorio** (un evento diario para el calendario del dispositivo,
la única forma fiable de avisar a una hora sin servidor en iPhone, Android y escritorio) y **tus
datos** (copia de seguridad para guardar y restaurar, combinando o reemplazando; protección del
almacenamiento; instalación; audio sin conexión; borrar el progreso). En Safari sin instalar, donde
los datos se borran tras 7 días sin visitas, un aviso discreto recuerda guardar una copia.

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
`L` para escuchar despacio · `E` para ver el ejemplo · `Enter` para seguir · `R` repaso del día ·
`D` mis difíciles · `Esc` para volver a los niveles.

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
src/lib/scheduler.ts      Repaso espaciado (FSRS): notas, calendario, migración desde Leitner y siguiente palabra
src/lib/smartDecks.ts     Repaso del día, "Mis difíciles" y previsión de repasos
src/lib/events.ts         Historial de respuestas (últimas 5000)
src/lib/stats.ts          Cálculos de las estadísticas
src/lib/dictionary.ts     Búsqueda y filtros del diccionario
src/lib/quiz.ts           Opciones de cada ronda (misma categoría, sin sentidos repetidos)
src/lib/typing.ts         Respuestas escritas: comparación tolerante y corrección letra por letra
src/lib/blitz.ts          Relámpago: palabras vistas y baraja sin repetir
src/lib/store.ts          Almacén en localStorage: versión, migraciones, validación y respaldo
src/lib/progress.ts       Progreso (tarjetas por sentido, historial diario, récord) y cómo combinar dos
src/lib/settings.ts       Ajustes (modo, meta, nuevas por día, sonido, tema…)
src/lib/backup.ts         Copias de seguridad: exportar, validar e importar
src/lib/onboarding.ts     Primer uso: si ya se completó la bienvenida
src/lib/placement.ts      Prueba de nivel: palabras por nivel y recomendación
src/lib/achievements.ts   Logros: condiciones, desbloqueo y anuncios agrupados
src/lib/feedback.ts       Sonidos y vibración según ajustes y movimiento reducido
src/lib/reminder.ts       Recordatorio diario como evento de calendario (.ics)
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

Stack: Vite, React 19, TypeScript 7, Tailwind CSS 4, vite-plugin-pwa (Workbox), ts-fsrs. Calidad: Vitest,
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
