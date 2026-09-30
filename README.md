# Tecla

Aprende vocabulario en inglés con una idea simple: aparece una palabra, suena su pronunciación y
pulsas la tecla con su traducción. Más de 8000 palabras (8461), de las más usadas a las más
difíciles, con repaso espaciado inteligente. Gratis, sin cuentas, sin anuncios y sin conexión.

## La sesión inteligente

La acción principal del inicio. Un entrenador decide qué practicar en cada ronda, sin elegir niveles:

- **Lo fallado vuelve** a las pocas rondas, marcado como «Otra vez», y luego según el repaso
  espaciado.
- **Repasos a tiempo** con FSRS: cada palabra tiene su estabilidad y dificultad, y vuelve cuando la
  probabilidad de recordarla baja a la retención elegida (relajado 85 %, normal 90 %, intensivo
  95 %). Primero lo que más riesgo tiene de olvidarse.
- **Escalera de habilidades:** cada palabra se aprende primero reconociéndola (inglés → español),
  luego recordándola (español → inglés), después de oído y por último escribiéndola.
- **Dificultad que se adapta:** las nuevas llegan en orden de frecuencia, a un ritmo que depende de
  cómo vas. Quien acierta casi todo y rápido **acelera**: las nuevas vienen de más adelante en la
  lista (más difíciles) y lo que ya sabía se aleja. Con errores **afianza**: menos palabras a la vez
  hasta consolidar. Con palabras ya afianzadas, las opciones se parecen más entre sí.
- La tarjeta del inicio resume la práctica de hoy (repasos, nuevas, minutos), el ritmo y el
  vocabulario que ya reconoces con su nivel orientativo (A1–C2).

La **prueba de nivel** de la bienvenida es adaptativa: prueba los niveles 1, 2, 4, 8, 16… y afina
entre el último superado y el primero fallado. Nadie contesta más de unas 20 palabras, y la sesión
inteligente empieza en el nivel recomendado. El **modo concentración** es una sesión de 5 minutos con
cuenta atrás.

## Más formas de practicar

- **Por tu cuenta:** 17 niveles de 500 palabras y cinco modos: **traducir**, **inverso**,
  **escuchar** (solo el audio), **escribir** (un error de tecleo es «¡casi!», con la corrección
  letra por letra) y **completar** (la frase de ejemplo con un hueco). Las opciones de cada ronda
  son de la misma categoría gramatical que la respuesta.
- **Colecciones** (#/colecciones): 19 temas (comida, animales, cuerpo, emociones, ropa,
  transporte…) generados a partir de WordNet con el sentido de la traducción. En una colección las
  opciones son del mismo tema: hay que saber la palabra exacta.
- **Repaso del día**, **Mis difíciles** y **Relámpago** (60 segundos contra el reloj).
- **Palabra del día:** una palabra nueva un poco más adelante de por donde vas, con su ejemplo.
- **Pronúnciala:** en la ficha de cada palabra, dices la palabra y el reconocimiento de voz del
  navegador te dice si se entiende (Chrome, Edge y Safari; Chrome lo hace con su servicio en línea).

Cada palabra tiene pronunciación con voz neuronal (se puede escuchar despacio sin cambiar el tono),
IPA, formas irregulares y una frase de ejemplo traducida.

## Tu progreso

**Tu progreso** (#/estadisticas) empieza por **Tu semana**: respuestas, acierto, nuevas, dominadas
ganadas, a qué hora rindes mejor y las palabras que más te costaron. Luego racha, tiempo, mapa de
calor, evolución de las dominadas, precisión semanal, avance por nivel, previsión de repasos y la
vitrina de **trece logros**. El **diccionario** (#/diccionario) busca en inglés y español y abre la
ficha de cada palabra: pronunciación, ejemplo, progreso por habilidad, últimas respuestas, favorita
y «ya la sé».

Hay meta diaria, límite de palabras nuevas, **protectores de racha** (uno cada 7 días con la meta
cumplida) y celebraciones proporcionales (sonido, vibración en Android, confeti) que respetan el
movimiento reducido.

## Tus datos

Todo se guarda en el dispositivo. Ajustes, por secciones: práctica (meta, nuevas por día,
intensidad del repaso, nivel de partida, ejemplo tras responder, pronunciación automática), sonido,
apariencia (claro, oscuro o automático), recordatorio (un evento diario para el calendario del
dispositivo) y tus datos (copia de seguridad para guardar, enviar y restaurar; protección del
almacenamiento; instalación; audio sin conexión; borrar el progreso). La copia lleva el progreso,
el historial, los logros y los ajustes, y se restaura desde la misma bienvenida en un dispositivo
nuevo. La sincronización automática está propuesta en
[docs/SINCRONIZACION.md](docs/SINCRONIZACION.md), pendiente de decisión.

Es una PWA: se instala en Android, iPhone y escritorio y funciona sin conexión desde la primera
visita. Cada pronunciación se guarda al sonar y desde Ajustes se pueden descargar todas
(unos 38 MB). Cada pantalla tiene su dirección (`#/sesion`, `#/nivel/3`, `#/tema/comida`,
`?panel=ajustes`…): el botón atrás recorre la app en vez de cerrarla.

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
npm run budget       # presupuesto de tamaño del build (tras npm run build)
npm run capture      # regenera la imagen para compartir y las capturas del manifiesto
```

No dejes nada escuchando en el puerto 4173: los e2e reutilizan lo que haya ahí (en vez de hacer
su propio build) y probarían una versión vieja. Para una vista previa manual, usa otro puerto.

La primera vez, los tests e2e necesitan los navegadores: `npx playwright install chromium webkit`.

Calidad: cada commit pasa por `npm run check` (hook de pre-commit con simple-git-hooks) y cada push
por la CI de GitHub Actions (`.github/workflows/ci.yml`): el check, el build con su presupuesto
de tamaño, los e2e en Chromium y WebKit (con axe en todas las pantallas, en los dos temas) y
Lighthouse en móvil (rendimiento ≥ 85; accesibilidad, buenas prácticas y SEO al 100). El linter es oxlint porque typescript-eslint aún no soporta TypeScript 7.

Atajos: `1`–`8` o `0` para elegir nivel · `1`–`4` para responder · `Espacio` para volver a escuchar ·
`L` para escuchar despacio · `E` para ver el ejemplo · `Enter` para continuar · `R` repaso del día ·
`D` mis difíciles · `Esc` para volver a los niveles.

## Despliegue en Hostinger

El build es un sitio estático: no necesita Node en el servidor. Las rutas son relativas, así que
funciona en la raíz del dominio o en una subcarpeta (p. ej. `public_html/ingles/`).

### Despliegue automático (recomendado)

`.github/workflows/deploy.yml` publica en Hostinger por FTPS cada vez que el CI pasa en `main`
(y a mano desde la pestaña **Actions → Despliegue → Run workflow**). Sube solo los archivos que
cambiaron. Mientras no esté configurado, se salta sin fallar. Para activarlo, en GitHub:
**Settings → Secrets and variables → Actions**:

| Tipo     | Nombre           | Valor                                                                           |
| -------- | ---------------- | ------------------------------------------------------------------------------- |
| Secreto  | `FTP_SERVER`     | Servidor FTP de hPanel (**Archivos → Cuentas FTP**), p. ej. `ftp.tudominio.com` |
| Secreto  | `FTP_USERNAME`   | Usuario FTP                                                                     |
| Secreto  | `FTP_PASSWORD`   | Contraseña FTP                                                                  |
| Variable | `SITE_URL`       | Dirección pública, p. ej. `https://tudominio.com/`                              |
| Variable | `DEPLOY_ENABLED` | `true`                                                                          |
| Variable | `FTP_SERVER_DIR` | Opcional. Carpeta de destino; por defecto `public_html/`                        |
| Variable | `FTP_PROTOCOL`   | Opcional. `ftps` por defecto; `ftp` solo si el plan no admite FTPS              |

Con `SITE_URL`, el build añade la URL canónica, las URLs absolutas de la imagen para compartir y
`sitemap.xml`. Sin ella todo funciona, pero sin esos extras.

### Despliegue manual

1. `SITE_URL=https://tudominio.com/ npm run build` (o solo `npm run build`).
2. Sube **el contenido** de `dist/` (no la carpeta en sí) a `public_html/`, con el Administrador
   de archivos de hPanel o por FTP. Incluye el archivo oculto `.htaccess`.

### Servidor

`public/.htaccess` configura HTTPS, compresión, caché larga para los archivos con hash, revalidación
del HTML, `sw.js` y el manifiesto (para que cada despliegue llegue al instante) y cabeceras de
seguridad. El service worker necesita HTTPS, que Hostinger incluye con su certificado SSL gratuito.
Cada MP3 se pide con la versión de su contenido (`audio/<id>.mp3?v=<hash>`, calculada en el build
por `vite/audio-versions.ts`), así que se cachea como inmutable: si se regenera un audio, su URL
cambia y llega a todos al instante.

## Estructura

```
public/audio/             Pronunciaciones, una por palabra: <id>.mp3
public/.htaccess          Configuración del servidor (Hostinger)
public/icons/             Iconos de la app (normal, maskable para Android y apple-touch-icon)
src/data/words.json       Vocabulario { id, en, es, pos }, ordenado por frecuencia. El id es el nombre del audio.
                          Se sirve como JSON aparte y main.tsx monta la app cuando llega.
src/data/details.json     IPA, formas y ejemplo de cada palabra (JSON aparte, en segundo plano)
src/data/topics.json      Colecciones temáticas: ids por tema (lo genera scripts/build_topics.py)
src/lib/vocabulary.ts     Carga del vocabulario (y cómo lo fijan los tests)
src/lib/words.ts          Valida el vocabulario al cargarlo
src/lib/coach.ts          Entrenador de la sesión inteligente: qué toca, ritmo y escalera de habilidades
src/lib/topicMeta.ts      Nombres de las colecciones; topics.ts, sus palabras y mazos
src/lib/wordOfDay.ts      Palabra del día
src/lib/weekly.ts         Informe de la semana
src/lib/speech.ts         Pronunciar con la voz (reconocimiento de voz del navegador)
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
src/lib/backup.ts         Copias de seguridad: exportar, validar, combinar y restaurar
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
vite/startup-preload.ts   Plugin de Vite: precarga en paralelo el vocabulario y los módulos de la app
vite/site-meta.ts         Plugin de Vite: metadatos para compartir, robots.txt y sitemap.xml
e2e/                      Tests de extremo a extremo (Playwright)
scripts/select_candidates.py Próximas palabras por frecuencia, filtradas (pip install wordfreq nltk)
scripts/merge_translations.py Suma al vocabulario los lotes traducidos y revisados
scripts/rank_words.py     Reordena words.json por frecuencia (pip install wordfreq)
scripts/build_topics.py   Genera topics.json con WordNet y el sentido de cada traducción
scripts/tag_pos.py        Categoría gramatical de cada palabra (pip install nltk)
scripts/enrich_words.py   Genera details.json: IPA, formas irregulares y ejemplos
scripts/data/examples/    Frases de ejemplo (fuente de details.json)
scripts/data/translations/ Lotes de la ampliación: candidatas, traducciones revisadas y su validador
scripts/generate_audio.py Genera el audio con la voz neuronal (pip install edge-tts)
```

Stack: Vite, React 19, TypeScript 7, Tailwind CSS 4, vite-plugin-pwa (Workbox), ts-fsrs. Calidad: Vitest,
Testing Library, Playwright, axe, oxlint y Prettier.

## Agregar palabras

1. `python scripts/select_candidates.py N` elige las N siguientes palabras por frecuencia, sin
   nombres propios, formas flexionadas, grafías británicas ni groserías.
2. Se traducen y revisan por lotes en `scripts/data/translations/batch-NN.json` (traducción,
   categoría y frase de ejemplo, o `skip` con el motivo) y se validan con
   `python scripts/data/translations/validate.py NN`.
3. `python scripts/merge_translations.py`, luego `rank_words.py`, `tag_pos.py`,
   `enrich_words.py` y `build_topics.py` (en ese orden).
4. `python scripts/generate_audio.py` crea el audio de las nuevas con la misma voz.
5. `npm test` comprueba ids únicos, audio, IPA, ejemplo, categoría y sentidos sin repetir.

Las traducciones siguen estas reglas: español latinoamericano neutro, el sentido más común primero,
como mucho dos o tres sentidos separados por coma y en minúscula salvo nombres propios. Dos palabras
que comparten un sentido nunca salen juntas como opciones (ver `senses()` en `src/lib/quiz.ts`), y
los distractores son de la misma categoría gramatical que la respuesta.

## Datos y licencias

- Frecuencias: [wordfreq](https://github.com/rspeer/wordfreq) (Apache 2.0; datos CC BY-SA 4.0).
- Pronunciación: [CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict)
  (BSD de 2 cláusulas), convertido a IPA por `scripts/enrich_words.py`.
- Categorías y plurales irregulares: [WordNet](https://wordnet.princeton.edu/) (licencia WordNet 3.0)
  y [Open Multilingual Wordnet](https://omwn.org/) para el español.
- Colecciones temáticas: campos semánticos de WordNet, alineados con la traducción.
- Traducciones, frases de ejemplo y verbos irregulares: propios del proyecto.
- Audio: voz neuronal en-US-AvaNeural de Microsoft (la de «Leer en voz alta» de Edge), generada con
  [edge-tts](https://github.com/rany2/edge-tts).

Para regenerar los detalles tras cambiar el vocabulario: `python scripts/enrich_words.py` (cada
palabra necesita su frase en `scripts/data/examples/`; `npm test` comprueba que ninguna falte y que
cada frase contenga su palabra).
