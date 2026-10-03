# Masterprompt · Tecla, fases 6 a 18

> Copia este documento completo como instrucción para el agente de código. Está pensado para
> ejecutarse **una fase por sesión**, en orden, empezando por la Fase 6. Al iniciar cada sesión
> indica: _"Ejecuta la Fase N del masterprompt en `docs/MASTERPROMPT.md`"_.

---

## 0. Tu rol

Actúas como **tech lead y staff engineer** de Tecla, con criterio de producto y de diseño a la
altura de Duolingo, Linear o Things. No eres un ejecutor de tareas: eres el responsable técnico del
producto. Eso significa:

- Entiendes el porqué antes de escribir código. Lees el código afectado completo antes de tocarlo.
- Tomas decisiones de arquitectura justificadas y las dejas documentadas (README o comentarios
  donde el código no se explica solo).
- Piensas en el usuario final, en el siguiente desarrollador y en el mantenimiento a 2 años.
- Si una instrucción de este documento choca con la realidad del código, lo detectas, lo explicas
  y propones la mejor alternativa. No sigues un plan a ciegas.

---

## 1. Contexto del proyecto (estado al cierre de la Fase 5)

**Tecla** es una PWA para aprender vocabulario en inglés, con la interfaz en español
latinoamericano neutro. El bucle central: aparece una palabra en inglés, suena su pronunciación y el
usuario pulsa una de 4 teclas con la traducción correcta. Ese bucle es la identidad de la app
y **no se rompe**: toda mejora lo enriquece, no lo reemplaza.

**Stack:** Vite 8, React 19, TypeScript 7 (strict), Tailwind CSS 4 (tokens en `src/index.css`),
vite-plugin-pwa (Workbox), Vitest 5. Tipografías: Inter Variable e Instrument Serif. Sin backend.

**Qué hay hoy:**

| Área             | Archivos                                         | Estado                                                                                   |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Vocabulario      | `src/data/words.json`                            | 3.978 palabras `{id, en, es}` ordenadas por frecuencia (wordfreq)                        |
| Audio            | `public/audio/<id>.mp3`                          | 3.978 MP3 generados con gTTS (~22 MB)                                                    |
| Niveles          | `src/lib/decks.ts`                               | 8 niveles de 500 + mazo "Todas las palabras"                                             |
| Repaso espaciado | `src/lib/scheduler.ts`                           | Leitner con 6 cajas (10 min → 60 días), recola de falladas en sesión                     |
| Opciones         | `src/lib/quiz.ts`                                | Distractores al azar que no comparten sentido con la respuesta                           |
| Persistencia     | `src/lib/store.ts`, `progress.ts`, `settings.ts` | `localStorage` (`tecla:progress:v1`, `tecla:settings:v1`), sincronizado entre pestañas   |
| Audio            | `src/lib/audio.ts`                               | Web Audio API, desbloqueo en iOS, caché LRU de 40 buffers                                |
| PWA              | `src/lib/pwa.ts`, `vite.config.ts`               | Instalable, offline, descarga de todo el audio, aviso de actualización                   |
| UI               | `src/components/*`                               | Selector de niveles, pantalla de juego, ajustes (sheet en móvil), tema claro/oscuro/auto |
| Modos            | `settings.direction`                             | Inglés → Español y Español → Inglés, con progreso separado                               |
| Tests            | `*.test.ts`                                      | Datos, niveles, distractores, planificador, racha                                        |
| Despliegue       | `public/.htaccess`, README                       | Sitio estático en Hostinger (`public_html`, también en subcarpeta)                       |

**Navegación actual:** `App.tsx` alterna entre `DeckPicker` y `Game` con `useState`. No hay rutas.

---

## 2. Reglas innegociables (aplican a TODAS las fases)

### 2.1 Git: todo avance se commitea y se pushea

- Repositorio remoto: **https://github.com/arguar13/Aplicacion-web-de-Ingl-s.git**, rama `main`.
- **Cada avance coherente se commitea y se pushea en el momento**, no al final de la fase. Una fase
  normalmente produce varios commits atómicos (p. ej. "infraestructura de rutas", "pantalla de
  estadísticas", "tests del planificador FSRS"). Nunca acumules una fase entera en un solo commit
  gigante, ni dejes trabajo terminado sin pushear.
- Antes de cada commit, en verde y sin excepciones: `npm run typecheck`, `npm run lint` (desde la
  Fase 6), `npm test` y `npm run build`. **Nunca se commitea código roto**, ni "arreglo después".
- Mensajes en español, en el estilo del historial: `Fase N: descripción concreta en imperativo o
resultado`. El cuerpo explica el porqué cuando no es obvio.
- Tras el `git push`, comprueba que se completó (`git status -sb` debe mostrar la rama al día con
  `origin/main`). Si el push falla, diagnostica la causa real (autenticación, divergencia) y
  resuélvela. **Prohibido `git push --force`**, `--no-verify` y reescribir historia publicada.
- Nunca se suben `node_modules`, `dist`, secretos ni archivos temporales.
- Al terminar la fase, además de los commits: README actualizado y un resumen final (ver §4).

### 2.2 Calidad senior / lead

- **Arquitectura primero.** Lógica de dominio pura y testeable en `src/lib/`, estado y efectos en
  `src/hooks/`, presentación en `src/components/`. Nada de lógica de negocio dentro de JSX.
- **TypeScript estricto de verdad.** Sin `any`, sin `as` para silenciar al compilador, sin `!`
  injustificados. Los datos que vienen de fuera (`localStorage`, JSON, archivos importados) se
  validan en el borde con un esquema, nunca se "castean".
- **Tests como parte de la entrega**, no como extra: toda lógica nueva lleva tests unitarios; todo
  flujo crítico de usuario, test end-to-end (desde la Fase 6).
- **Dependencias con criterio.** Antes de añadir una librería, pregúntate si 30 líneas propias
  bastan. Si la añades, que sea mantenida, ligera, con licencia compatible y justificada en el
  commit. Vigila el tamaño del bundle.
- **Datos del usuario sagrados.** Ningún cambio puede hacer perder el progreso de alguien que ya
  usa la app. Todo cambio de formato de almacenamiento va con migración versionada y con test.
- **Coherencia.** Imita el estilo existente: nombres en inglés en el código, comentarios y textos
  de interfaz en español, `cn()` para clases, tokens de color de `index.css`, alias `@/`.
- **Rendimiento.** Nada de recalcular todo el vocabulario en cada render si puede derivarse o
  memoizarse. La app debe sentirse instantánea en un Android de gama media.
- **Accesibilidad (WCAG 2.2 AA)** en cada cambio: foco visible, navegación completa por teclado,
  roles y `aria-*` correctos, contraste suficiente en ambos temas, `prefers-reduced-motion`.

### 2.3 Cada error se soluciona de raíz

- Ante cualquier bug, fallo de test o warning: **reprodúcelo, encuentra la causa raíz y corrígela
  ahí**. Explica en el commit qué lo causaba.
- **Prohibidos los parches temporales**: `setTimeout` para "esperar a que cargue", `try/catch` que
  se traga errores, `// @ts-ignore`, `eslint-disable`, `!important`, tests desactivados o
  debilitados para que pasen, condicionales especiales para un caso concreto, valores mágicos.
- Si el bug revela un fallo de diseño (estado duplicado, responsabilidades mezcladas), refactoriza
  el diseño. Un arreglo que solo esconde el síntoma no cuenta como arreglo.
- Añade un test que habría detectado el bug, para que no vuelva.
- Si encuentras un problema fuera del alcance de la fase, no lo ignores: si es pequeño, corrígelo en
  un commit aparte; si es grande, anótalo en el resumen de la fase.

### 2.4 Interfaz: intuitiva, muy elegante, atractiva y atrapante

Toda pantalla, botón, control o función nueva debe cumplir **todo** esto:

- **Intuitiva:** un usuario nuevo entiende qué hacer sin leer instrucciones. Una acción principal
  clara por pantalla. Textos breves, cálidos y concretos, en español latinoamericano neutro.
- **Elegante:** respeta y amplía el sistema visual existente (papel cálido de día, tinta profunda
  de noche, Instrument Serif para titulares, Inter para interfaz, teclas con relieve). Ritmo
  espacial consistente, jerarquía tipográfica clara, nada de colores fuera de los tokens. Si hace
  falta un token nuevo, se define en `:root` y en `[data-theme='dark']`.
- **Atractiva y atrapante:** microinteracciones con intención (respuesta inmediata al toque,
  transiciones suaves de 150–400 ms, celebraciones proporcionales al logro), sensación de avance
  constante y ganas de "una ronda más". Nunca efectos gratuitos ni que retrasen al usuario.
- **Completa en todos sus estados:** vacío, cargando, error, sin conexión, primer uso, mucho
  contenido. Ningún estado queda "por defecto del navegador".
- **Responsive real:** verifica cada cambio visual con capturas en **móvil vertical (390×844),
  móvil horizontal (844×390), tablet (820×1180) y escritorio (1440×900)**, en **tema claro y
  oscuro**. Objetivos táctiles de al menos 44×44 px. Respeta `safe-area-inset`.
- **Teclado de primera clase** en escritorio: todo con atajos visibles (`<Kbd>`), como hoy.
- Si dudas entre dos diseños, elige el más simple que se sienta premium.

### 2.5 Restricciones de plataforma

- El despliegue es **estático en Hostinger** (Apache/LiteSpeed con `.htaccess`). No hay Node en el
  servidor. Toda ruta debe funcionar en la raíz del dominio **y** dentro de una subcarpeta
  (`base: './'`).
- Todo debe seguir funcionando **sin conexión** tras la primera visita.
- Cualquier decisión que implique **backend, servicios de pago, cuentas de usuario, cambio de
  hosting o datos personales** se consulta con el dueño del proyecto antes de implementarla.

---

## 3. Diagnóstico inicial (verifícalo antes de actuar)

Hallazgos de una lectura completa del código. Confírmalos en el código antes de corregirlos; si
alguno no es cierto, descártalo con una nota.

1. **Botón "atrás" roto.** Sin rutas, el botón atrás del navegador o de Android sale de la app en
   vez de volver a los niveles. Tampoco hay enlaces directos a un nivel.
2. **Sin red de seguridad de calidad.** No hay ESLint, Prettier, CI, tests de componentes ni tests
   end-to-end. Un error en render deja la pantalla en blanco (no hay error boundary).
3. **Persistencia frágil.** `progress.ts` hace `{ ...EMPTY, ...raw }` sin validar la forma de
   `cards` ni de `days`; un dato corrupto puede romper la app. Las claves `v1` no tienen un sistema
   de migraciones.
4. **Riesgo de perder el progreso.** Safari borra el almacenamiento de sitios no instalados tras 7
   días sin visitas, y todo vive en `localStorage` de un solo dispositivo. No hay exportar/importar
   ni `navigator.storage.persist()`.
5. **Distractores demasiado fáciles.** Se eligen al azar sin considerar categoría gramatical: un
   verbo contra tres sustantivos se adivina sin saber la palabra.
6. **Datos pobres.** Cada palabra solo tiene `en` y `es`: sin categoría gramatical, sin IPA, sin
   oración de ejemplo. Aprender palabras sin contexto limita la retención.
7. **Planificador básico.** Leitner con intervalos fijos no se adapta a la dificultad real de cada
   palabra ni a la memoria de cada usuario.
8. **Cálculos repetidos.** `DeckPicker` y `Game` ejecutan `summarize()` sobre miles de palabras en
   cada render y cada minuto.
9. **Caché de audio sin versión.** Si se regenera un MP3, el service worker (`CacheFirst`) y el
   `.htaccess` (30 días) siguen sirviendo el viejo. El README lo documenta como limitación en vez
   de resolverlo.
10. **Audio offline en primera visita.** `offlineAudioSupported()` depende de
    `navigator.serviceWorker.controller`, que no existe hasta recargar: en la primera visita la
    opción de descargar no aparece.
11. **Sin sesión con principio y fin.** El juego es infinito: no hay meta diaria, ni resumen de
    sesión, ni sensación de cierre, que es lo que hace volver al día siguiente.

---

## 4. Método de trabajo en cada fase

1. **Reconocer:** lee este documento, el README y todo el código que vas a tocar. Revisa
   `git log` para entender el contexto.
2. **Planificar:** escribe un plan breve (objetivo, decisiones de arquitectura, riesgos, commits
   previstos). Si hay una decisión de producto ambigua o irreversible, pregunta antes de empezar.
3. **Implementar en pasos atómicos:** cada paso termina con typecheck, lint, tests y build en verde
   → **commit → push**.
4. **Verificar visualmente:** levanta la app (`npm run dev` y también `npm run build && npm run
preview` para lo que toque la PWA) y revisa capturas en los 4 tamaños y los 2 temas. Corrige lo
   que no esté impecable antes de dar la fase por terminada.
5. **Documentar:** actualiza el README (funciones, estructura, comandos) y los comentarios útiles.
6. **Cerrar:** último commit y push; confirma que `main` está al día con `origin/main`. Entrega un
   resumen con: qué se hizo, decisiones tomadas y por qué, capturas o descripción de lo visual,
   deuda o riesgos detectados y qué propone para la siguiente fase.

---

## 5. Fases

### Fase 6 · Cimientos de ingeniería y navegación

**Objetivo:** que la app tenga la base de un producto profesional antes de crecer.

- **ESLint** (flat config, reglas de TypeScript, React Hooks y accesibilidad con jsx-a11y) y
  **Prettier** (con el orden de clases de Tailwind). Formatea el código existente en un commit
  aislado para no mezclar cambios de formato con cambios de lógica. Añade `lint` y `format` a
  `package.json`.
- **CI en GitHub Actions**: typecheck, lint, tests, build y e2e en cada push y pull request.
- **Rutas reales** (diagnóstico 1): inicio, nivel (`/nivel/3`), ajustes y las pantallas futuras.
  El botón atrás del navegador y de Android debe volver a la pantalla anterior; los enlaces
  directos deben funcionar al recargar, en la raíz y en una subcarpeta de Hostinger, y sin conexión
  (`navigateFallback`). Evalúa hash routing frente a History API + regla en `.htaccess` y justifica
  la elección. Transiciones entre pantallas con View Transitions API donde exista, con degradación
  elegante.
- **Error boundary** con una pantalla de error cuidada y en tono de la app ("Algo se trabó"), que
  ofrezca recargar sin perder el progreso.
- **Persistencia robusta** (diagnóstico 3): validación de esquema en la lectura, sistema de
  migraciones versionadas (`v1 → v2 …`) con tests que prueben que un progreso real de la Fase 5 se
  migra sin pérdidas, y datos corruptos que se recuperan sin romper la app.
- **Rendimiento** (diagnóstico 8): memoiza o deriva los resúmenes de mazos. Mide antes y después.
- **Tests E2E con Playwright**: elegir nivel, responder bien y mal, volver atrás, cambiar tema,
  modo sin conexión (build de producción). En viewport de móvil y de escritorio.
- **Sistema de componentes:** extrae primitivas reutilizables (Button con variantes, Card, Sheet,
  Toast, Badge) a partir de los estilos repetidos hoy en `DeckPicker`, `SettingsDialog`,
  `AppSettings` y `UpdateToast`. Sin cambiar el aspecto visual.

**Criterios de aceptación:** CI en verde en GitHub; el botón atrás funciona en Android instalado;
un `localStorage` con datos de la Fase 5 sigue funcionando; un JSON corrupto no rompe la app;
ningún cambio visual no intencionado.

### Fase 7 · Vocabulario enriquecido

**Objetivo:** que cada palabra enseñe más que una traducción.

- Amplía el modelo de datos: **categoría gramatical** (✅ hecho: campo `pos` y
  `scripts/tag_pos.py`), **IPA**
  (transcripción fonética), **oración de ejemplo en inglés con su traducción** y, cuando aplique,
  formas irregulares (plural, pasado, participio).
- Script reproducible en `scripts/` para generar o enriquecer los datos, con fuentes de licencia
  compatible documentadas en el README. Las oraciones deben ser naturales, cortas (≤ 12 palabras),
  del nivel de la palabra y en inglés americano; las traducciones siguen las reglas del README.
- **Validación automática** en tests: esquema de cada entrada, el ejemplo contiene la palabra (o
  una forma flexionada), categorías dentro de un conjunto cerrado, sin duplicados.
- **Separa los datos**: lo que necesita la ronda (`id`, `en`, `es`, categoría) en el bundle; los
  detalles (IPA, ejemplos) en archivos por nivel que se cargan de forma diferida y quedan cacheados
  para uso offline. Mide el tamaño del bundle antes y después.
- ✅ **Distractores inteligentes** (diagnóstico 5): hecho, misma categoría gramatical con
  respaldo por familia. Pendiente: afinar por dificultad similar en el mazo "Todas las palabras".
- **Tarjeta de detalle tras responder:** al acertar o al fallar, una revelación elegante con IPA,
  categoría y ejemplo (con la palabra resaltada), sin frenar el ritmo del usuario experto: el
  avance automático sigue existiendo y la tarjeta puede expandirse con un toque o una tecla.
- **Pronunciación lenta**: botón o pulsación larga para oír la palabra más despacio
  (`playbackRate` en Web Audio, sin archivos nuevos).
- ✅ **Caché de audio versionada** (diagnóstico 9): hecho (`vite/audio-versions.ts`). Los audios de
  ejemplos que se añadan deben usar el mismo mecanismo.

**Criterios de aceptación:** 100 % de las palabras con IPA; ejemplos revisados en
todos los niveles; tests de datos en verde; el bundle inicial no crece más de lo justificado.

### Fase 8 · Motor de aprendizaje de nueva generación

**Objetivo:** que la app sepa exactamente qué enseñar y cuándo, y que cada sesión tenga forma.

- **Migrar de Leitner a FSRS** (p. ej. `ts-fsrs`, o implementación propia si se justifica).
  Migración del progreso existente: cada caja Leitner se convierte en un estado FSRS razonable, con
  tests. Considera un segundo nivel de respuesta además de acierto/fallo (p. ej. acierto lento
  frente a acierto rápido, midiendo el tiempo de respuesta) para alimentar mejor el algoritmo.
- **Sesiones con principio y fin** (diagnóstico 11): meta diaria configurable (p. ej. 10, 20 o 40
  palabras, o minutos), límite de palabras nuevas por día, y **pantalla de resumen de sesión**:
  palabras aprendidas, precisión, racha, palabras falladas para repasar y una llamada clara a
  "seguir" o "terminar por hoy".
- **Mazo "Mis difíciles"**: palabras con más fallos (sanguijuelas), generado automáticamente.
- **Repaso del día** en la pantalla principal: cuántas palabras tocan hoy en todos los niveles y un
  botón para repasarlas todas juntas.
- **Previsión de carga**: cuántos repasos vendrán en los próximos 7 días.

**Criterios de aceptación:** progreso previo migrado sin pérdidas y con tests; resumen de sesión
pulido en los 4 tamaños; el planificador tiene tests de propiedades (nunca repite seguido, siempre
prioriza lo vencido, respeta el límite de nuevas).

### Fase 9 · Nuevos modos de práctica

**Objetivo:** entrenar comprensión auditiva, escritura y contexto, no solo reconocimiento.

- **Selector de modo** elegante en la pantalla principal (con el sentido actual como modo más).
  Cada modo con su propio progreso donde tenga sentido pedagógico, y el planificador compartido.
- **Escucha:** suena la palabra sin mostrarla; se elige la traducción. Ideal para el oído.
- **Escritura:** se muestra la traducción y el usuario escribe la palabra en inglés. Tolerancia
  inteligente (mayúsculas, espacios, un error tipográfico cuenta como "casi" con feedback que
  muestra la diferencia letra por letra). Teclado móvil sin autocorrección ni mayúscula automática.
- **Completar la frase (cloze):** el ejemplo de la Fase 7 con un hueco; se elige la palabra.
- **Relámpago:** 60 segundos, tantas palabras como se pueda, con récord personal. Solo con palabras
  ya vistas, para no presionar con palabras nuevas.
- Todos los modos respetan el bucle de teclas numéricas en escritorio y la ergonomía táctil en móvil.

**Criterios de aceptación:** cada modo tiene tests de su lógica y un test e2e; los modos se
sienten parte de la misma familia visual; el modo clásico sigue idéntico en comportamiento.

### Fase 10 · Estadísticas y diccionario personal

**Objetivo:** que el usuario vea su progreso y sienta orgullo de él.

- **Pantalla de estadísticas:** mapa de calor de actividad (estilo contribuciones de GitHub, con
  los colores de la app), palabras dominadas en el tiempo, precisión por semana, tiempo estudiado,
  distribución por nivel y previsión de repasos. Gráficos hechos a medida en SVG o con una librería
  ligera; legibles en ambos temas y en móvil.
- Para esto, registra un **historial de eventos de estudio** compacto (fecha, palabra, modo,
  resultado, tiempo de respuesta) con límite de tamaño y migración incluida.
- **Diccionario personal:** lista de todas las palabras con búsqueda instantánea (con y sin tildes,
  en inglés y en español), filtros por estado (nueva, aprendiendo, dominada, difícil), por nivel y
  por categoría, y virtualización para que 4.000 filas vayan fluidas.
- **Ficha de palabra:** traducción, IPA, audio normal y lento, ejemplo, historial propio con esa
  palabra y próxima fecha de repaso. Opción de marcarla como favorita o como "ya la sé".

**Criterios de aceptación:** la búsqueda responde en < 50 ms con todo el vocabulario; las gráficas
tienen texto alternativo y funcionan con teclado; nada se ve vacío o roto para un usuario nuevo.

### Fase 11 · Motivación, onboarding y celebración

**Objetivo:** que empezar sea fácil y volver sea irresistible.

- **Onboarding** de primer uso (3 pantallas como máximo, saltable): qué es Tecla, elegir meta
  diaria y una **prueba de nivel** rápida que recomienda por qué nivel empezar y marca como sabidas
  las palabras que el usuario ya domina.
- **Logros** con diseño propio (no emojis genéricos): primera sesión, 7 y 30 días de racha, 100,
  500 y 1.000 palabras dominadas, nivel completado, sesión perfecta… Con una vitrina en
  estadísticas.
- **Racha mejorada:** protector de racha que se gana estudiando, y aviso visual de que la racha
  está en riesgo hoy.
- **Celebraciones proporcionales:** algo sutil al acertar (ya existe), algo más al completar la meta
  diaria, y algo memorable al completar un nivel. Respetan `prefers-reduced-motion`.
- **Sonidos y vibración opcionales** (efectos cortos y discretos al acertar y al fallar,
  `navigator.vibrate` en Android), desactivables en Ajustes y apagados si el sistema pide
  reducir movimiento.
- **Recordatorio diario** opcional: evalúa qué es viable sin backend (notificaciones locales de la
  PWA, limitaciones de iOS) y comunica claramente al usuario lo que es posible.

**Criterios de aceptación:** un usuario nuevo llega a su primera ronda en menos de 30 segundos;
todas las celebraciones y logros tienen tests de sus condiciones; nada interrumpe el ritmo del
juego más de lo necesario.

### Fase 12 · Datos seguros y portabilidad

**Objetivo:** que nadie pierda nunca su progreso (diagnóstico 4).

- ✅ Hecho en la Fase 6: exportar e importar el progreso (con versión, validación, vista previa,
  combinar o reemplazar), `navigator.storage.persist()`, aviso en Safari sin instalar y audio
  offline desde la primera visita (diagnóstico 10). Queda por revisar si los datos nuevos de las
  Fases 8–11 (historial, logros, metas) entran en la copia: deben entrar, con su migración.
- **Sincronización entre dispositivos: solo como propuesta.** Presenta al dueño opciones con costos
  y compromisos (p. ej. PHP + MySQL en el mismo Hostinger, un servicio gestionado, o sincronización
  por archivo/código QR sin servidor) y **no implementes ninguna sin su aprobación**.

**Criterios de aceptación:** exportar en un dispositivo e importar en otro deja el progreso
idéntico (test e2e); importar un archivo inválido muestra un error claro y no toca los datos.

### Fase 13 · Pulido de producto y lanzamiento

**Objetivo:** calidad de producto listo para mostrar al mundo.

- **Auditoría de accesibilidad** completa (axe en los tests e2e, lector de pantalla en iOS y
  Android, navegación solo con teclado) y corrección de todo lo encontrado.
- **Lighthouse ≥ 95** en rendimiento, accesibilidad, buenas prácticas y SEO, en móvil. Presupuesto
  de tamaño del bundle comprobado en CI.
- **SEO y compartir:** metadatos Open Graph y Twitter, imagen para compartir con el diseño de la
  app, `robots.txt`, `sitemap.xml`, capturas en el manifiesto para la instalación enriquecida.
- **Revisión visual integral** pantalla por pantalla en los 4 tamaños y 2 temas: espaciados,
  alineaciones, estados vacíos, textos, consistencia de iconos y microinteracciones.
- **Despliegue automatizado** a Hostinger desde GitHub Actions (FTP/SFTP con secretos del
  repositorio) al hacer push a `main`, con el build probado antes. Los secretos los configura el
  dueño; documenta los pasos exactos en el README.
- **Changelog** (`CHANGELOG.md`) con todas las fases y versión semántica en `package.json`.

**Criterios de aceptación:** Lighthouse y axe en verde en CI; despliegue automático funcionando
(o documentado a falta solo de los secretos); README y CHANGELOG al día.

---

### Segunda etapa (fases 14 a 18) · pedido del dueño del 29-09-2026

> "Más palabras; que empiece por las más frecuentes y, a medida que aprendo, me dé palabras más
> difíciles; que lo que fallo vuelva; repetición espaciada inteligente para no olvidar; más
> funciones premium; un estilo moderno (hoy parece retro), elegante, atractivo y premium; todo
> absolutamente gratis."

Reglas adicionales de esta etapa:

- **Gratis de verdad:** nada de pagos, cuentas, anuncios ni servicios de terceros de pago. Todo
  corre en el navegador o se genera en el build (fuentes, voces y datos con licencias libres).
- **Nunca perder progreso:** el vocabulario crece sin cambiar el `id` de las palabras que ya
  existen, y cualquier cambio de formato guardado pasa por una migración versionada con test.

### Fase 14 · Rediseño moderno y premium

**Objetivo:** que Tecla se sienta una app actual de primer nivel, no un cuaderno antiguo.

- Nueva identidad visual en los tokens de `index.css`: neutros fríos (en lugar del papel cálido),
  acento índigo–violeta vivo con degradado sutil y superficies con profundidad (bordes finos,
  sombras suaves en capas, vidrio esmerilado en la cabecera).
- Tipografía: una grotesca moderna (Geist) para títulos y cifras, con Inter para el texto
  corrido. Se retira la serif de estilo antiguo.
- Componentes base renovados (botones, teclas de respuesta, tarjetas, hojas, chips, interruptores)
  y microinteracciones con muelle; todo respeta `prefers-reduced-motion`.
- Modo oscuro de primer nivel (negro profundo con resplandores de color), contraste AA en ambos
  temas y con las pruebas de axe en verde.
- Revisión de cada pantalla en 4 tamaños y 2 temas; capturas e imagen para compartir regeneradas.

**Criterios de aceptación:** ninguna pantalla conserva la estética anterior; axe y Lighthouse en
verde; las capturas del manifiesto muestran el diseño nuevo.

### Fase 15 · Vocabulario ampliado

**Objetivo:** duplicar el vocabulario con la misma calidad.

- De 3978 a unas 8000 palabras, elegidas por frecuencia real (wordfreq) y filtradas: sin nombres
  propios, sin formas flexionadas que ya estén como lema, sin groserías ni fragmentos.
- Cada palabra nueva con traducción revisada al español neutro latinoamericano, categoría
  gramatical, IPA, formas irregulares, frase de ejemplo traducida y audio (gTTS, como las demás).
- Nuevos niveles con nombre y descripción.
- **El vocabulario deja de ir dentro del JavaScript inicial** (hoy ya pesa la mitad del arranque;
  duplicado lo empeoraría): se carga como JSON en paralelo con la app, precacheado para usarlo sin
  conexión, y la pantalla de arranque cubre la espera.

**Criterios de aceptación:** el progreso de las 3978 palabras actuales se conserva intacto (test);
el JS inicial no crece; todas las palabras tienen audio, ejemplo e IPA (test de datos).

### Fase 16 · Motor de aprendizaje inteligente

**Objetivo:** que la app decida sola qué practicar y lo adapte a cada persona.

- **Sesión inteligente** como acción principal del inicio: mezcla los repasos que vencen, lo que
  se falló y palabras nuevas, sin elegir niveles a mano (los niveles siguen disponibles).
- **Dificultad adaptativa:** las palabras nuevas llegan en orden de frecuencia, pero el ritmo y el
  punto de avance se ajustan a los resultados. Con aciertos rápidos y sostenidos avanza más rápido
  y puede saltar lo que ya sabes (con una comprobación); con errores frena las nuevas y refuerza lo
  pendiente.
- **Escalera de habilidades por palabra:** primero reconocer (inglés → español), luego recordar
  (español → inglés), después escuchar y por último escribir. Cada palabra sube de escalón al
  dominar el anterior.
- **Distractores cada vez más finos:** con el dominio, las opciones se parecen más (misma
  categoría, significado cercano o forma parecida).
- **Lo fallado vuelve:** reaparece dentro de la misma sesión a los pocos turnos y luego según FSRS.
  La retención objetivo se puede ajustar (relajado, normal o intensivo).

**Criterios de aceptación:** tests unitarios del planificador con usuarios simulados (principiante,
avanzado, irregular) que demuestran la adaptación; e2e de una sesión inteligente completa.

### Fase 17 · Funciones premium (gratis)

**Objetivo:** funciones de app de pago, sin coste.

- **Pronunciación con tu voz:** dices la palabra y la app la reconoce (Web Speech API del
  navegador, sin servidor), con una pista si no coincide. Se ofrece solo donde el navegador lo
  permite.
- **Colecciones temáticas** (comida, viajes, cuerpo, trabajo, emociones, casa…), generadas en el
  build a partir de las categorías de WordNet, para practicar por tema.
- **Palabra del día** en el inicio, con su ejemplo y audio.
- **Informe semanal:** progreso, palabras más costosas, mejor momento del día y logros.
- **Modo concentración:** sesión de 5 minutos sin distracciones, con cuenta atrás.

**Criterios de aceptación:** cada función con tests; nada que requiera cuenta, pago ni conexión
(salvo el reconocimiento de voz donde el navegador lo haga en línea, avisado).

### Fase 18 · Cierre de la segunda etapa

- Rendimiento: JS inicial dentro del presupuesto y Lighthouse ≥ 95 en móvil si el vocabulario
  asíncrono lo permite (fue el límite en la Fase 13).
- README, CHANGELOG (2.0.0), capturas y registro de avance al día.

---

### Tercera etapa · pedido del dueño del 01-10-2026

> "Analiza la aplicación y agrégale más funcionalidades profesionales que le hagan falta, cosas que
> la potencien a la hora de aprender inglés y la hagan más premium y completa."

### Fase 19 · Funciones profesionales de aprendizaje

**Objetivo:** lo que distingue a una app de pago, sin cuentas, pagos ni servicios externos.

- **Tarjetas** (autoevaluación con las cuatro notas de FSRS y vista previa de intervalos) y
  **dictado** (oír y escribir), con la escalera de habilidades intacta.
- **Pista** en escribir (cuenta como «casi») y **favoritas** como mazo.
- **Experiencia, rangos y misiones del día** (deterministas por fecha, premiadas una sola vez).
- **Tu camino:** proyección A1–C2 con el ritmo de los últimos 30 días.
- **Frase de ejemplo en voz alta** (síntesis de voz del navegador) y **exportar a CSV** (Anki).
- **Panel de atajos** con `?`.

**Criterios de aceptación:** cada función con tests unitarios y e2e; sin cambios de formato
guardado sin compatibilidad y test; presupuesto de tamaño respetado; axe en verde.

---

### Fase 20 · El curso de A1 a C2 (pedido del 01-10-2026)

> "Agrega fases de aprendizaje A2, B1 y así, fases reales y con el conocimiento para aprender, y
> evaluaciones y ejercicios."

- Seis niveles con lecciones (explicación, ejemplos, tablas, consejo) y ejercicios de cuatro tipos;
  examen por nivel aprobado con el 80 %. Contenido en JSON por nivel, validado al cargarlo y por
  test; progreso con mejor nota, experiencia y copia de seguridad.

---

### Fase 21 · Un curso con el rigor de las certificaciones (pedido del 01-10-2026)

> "Crea los audios grabados y enriquece los niveles: que el temario cumpla con la rigurosidad de las
> certificaciones y enseñe todo. Agrega quizzes, comprensión lectora y auditiva, y que el pipeline
> esté en verde y se despliegue de verdad."

- Temario completo por nivel (74 lecciones, ocho ejercicios cada una, exámenes de 23 o 24),
  quizzes por nivel y mixto, comprensión lectora y auditiva, y pipeline de audio grabado para las
  frases del curso. CI y despliegue comprobados en local paso a paso.

---

## 6. Definición de terminado (para cada fase)

- [ ] Todo lo pedido en la fase implementado y verificado, o explicado por qué no.
- [ ] Typecheck, lint, tests unitarios, e2e y build en verde, en local y en CI.
- [ ] Ninguna pérdida del progreso de usuarios existentes (migración con test si aplica).
- [ ] Capturas revisadas: móvil vertical y horizontal, tablet y escritorio, tema claro y oscuro.
- [ ] Accesible con teclado y lector de pantalla; respeta reducir movimiento.
- [ ] Funciona sin conexión tras la primera visita.
- [ ] README actualizado.
- [ ] Todos los avances commiteados en commits atómicos y **pusheados a
      `https://github.com/arguar13/Aplicacion-web-de-Ingl-s.git`**, con `main` al día con
      `origin/main`.
- [ ] Resumen final entregado con decisiones, riesgos y propuesta para la siguiente fase.

---

## 7. Registro de avance

Actualiza esta sección al cerrar cada fase.

### Fase 6 · cerrada el 27-09-2026

- Diagnóstico 1 (atrás), 2 (calidad), 3 (persistencia), 4 (riesgo de perder el progreso),
  5 (distractores), 8 (cálculos repetidos), 9 (caché de audio) y 10 (audio en primera visita):
  **resueltos**. Quedan 6 (datos pobres, Fase 7), 7 (planificador, Fase 8) y 11 (sesiones, Fase 8).
- Decisiones que cambian lo escrito arriba:
  - **oxlint en lugar de ESLint**: typescript-eslint no soporta TypeScript 7. oxlint incluye las
    reglas de React Hooks, jsx-a11y, import y Vitest, y el análisis con tipos.
  - **Sin View Transitions**: WebKit con emulación de iPhone se colgaba al salir de la partida
    (5 de cada 8 veces). Cada pantalla entra con una animación CSS (`animate-screen`).
  - **Rutas en el hash** (`#/nivel/3`), no History API: el build usa rutas relativas para poder
    desplegarse en una subcarpeta.
- Reglas de trabajo nuevas: un **hook de pre-commit** ejecuta `npm run check` (no se puede
  commitear con tipos, lint, formato o tests en rojo; nunca uses `--no-verify`). Los tests e2e
  (`npm run test:e2e`) corren contra el build en Chromium móvil, Chromium escritorio y WebKit.
  Contraste: los tokens del tema claro se ajustaron a WCAG AA; axe lo comprueba en los e2e.
- Herramientas locales que no deben entrar al repo: nómbralas `*.local.*` (están en `.gitignore`).
- **Bloqueo externo:** la CI de GitHub Actions termina en `startup_failure` sin crear jobs,
  aunque el workflow es válido. Parece un problema de la cuenta (facturación o minutos de Actions en
  un repo privado). Lo tiene que revisar el dueño en GitHub → Settings → Billing / Actions.

### Fase 7 · cerrada el 27-09-2026

- Diagnóstico 6 (datos pobres): **resuelto**. Las 3978 palabras tienen IPA (CMUdict → IPA con
  acento silábico), categoría, formas irregulares y frase de ejemplo con traducción; los detalles
  van en su propio chunk (189 KB gzip) cargado en segundo plano.
- Tarjeta de detalle tras responder (se detiene sola al fallar; configurable), pronunciación lenta
  con `preservesPitch`, distractores de frecuencia cercana en el mazo completo.
- El etiquetador de categorías prioriza la primera acepción de la traducción (la que ve el usuario);
  las excepciones van en `POS_OVERRIDES` de `scripts/tag_pos.py`.
- La palabra en juego es el `<h1>` y el teclado el grupo "Respuestas": los e2e seleccionan por rol.
- Pendiente para más adelante: audio de las frases de ejemplo (no se generó para no inflar la
  descarga offline; si se añade, con el mismo versionado de `vite/audio-versions.ts`).

### Fase 8 · cerrada el 27-09-2026

- Diagnósticos 7 (planificador) y 11 (sesiones sin cierre): **resueltos**.
- FSRS (ts-fsrs) con nota según fallos y tiempo de respuesta; progreso v2 con migración desde
  Leitner que conserva fechas y dominadas (test con datos reales de la Fase 5).
- Historial diario en el progreso (`history`), meta diaria, límite de nuevas, resumen de sesión,
  repaso del día, "Mis difíciles" y previsión de 7 días.
- Regla aprendida: **los e2e se encadenan al commit** (`npm run check && npx playwright test && git
commit`); un resumen de Playwright se lee entero, no solo la última línea.

### Fase 9 · cerrada el 27-09-2026

- Modos: traducir, inverso, escuchar, escribir y completar (selector en el inicio) y Relámpago como
  juego aparte (no cambia el repaso espaciado; cuenta para la meta del día).
- `Direction` pasó a `Mode` (cómo se practica) y `Track` (habilidad con tarjetas propias:
  en-es, es-en, listen, type; completar comparte con en-es). El ajuste guardado `direction` se lee
  como `mode`.
- Escribir: Damerau-Levenshtein 1 en palabras de 4+ letras = "casi" (nota FSRS "difícil").
- Los atajos globales ignoran los campos de texto; axe mide con movimiento reducido (evita falsos
  fallos intermitentes de contraste durante animaciones).
- Limitación conocida del entorno: el WebKit de Playwright en Windows no tiene audio (el e2e de
  escuchar se omite ahí; en la CI de Linux corre).

### Fase 10 · cerrada el 27-09-2026

- Historial de respuestas (`tecla:events`, 5000 como máximo, entra en las copias) y dominadas por
  día en el historial diario.
- Estadísticas: resumen, mapa de calor, dominadas en el tiempo, precisión por semana, avance por
  nivel y previsión. Las gráficas recorribles son `role="slider"` con `aria-valuetext`.
- Diccionario con búsqueda normalizada y lista virtualizada; ficha de palabra como panel de ruta
  (`?palabra=<id>`), favoritas y "ya la sé" con deshacer.
- Lecciones de maquetación (con test): grillas con columnas explícitas en móvil (`grid-cols-1`),
  `min-w-0` en fieldsets desplazables y etiquetas `relative` con radios `sr-only`. Hay un e2e de
  desbordamiento a 360 px.

### Fase 11 · cerrada el 27-09-2026

- Bienvenida de primer uso (saltable, 3 pasos) con meta diaria y prueba de nivel; los usuarios que
  ya tenían progreso no la ven. Los e2e la saltan con la opción `onboarded` del fixture.
- 13 logros con medallas SVG propias, anuncio no bloqueante (agrupado si llegan varios, p. ej. al
  restaurar una copia) y vitrina en estadísticas.
- Protectores de racha (1 cada 7 días con meta cumplida, máximo 2) y aviso de racha en riesgo.
- Sonidos sintetizados, vibración en Android y confeti proporcional; todo respeta
  `prefers-reduced-motion` y se desactiva en Ajustes.
- Recordatorio diario: evaluado; sin backend, lo único fiable en iOS, Android y escritorio es un
  evento recurrente de calendario (.ics), que es lo que se ofrece. Ajustes agrupado por secciones.
- Lección aprendida: una constante usada antes de declararse (TDZ) dejó la app en blanco. Raíz:
  orden de declaración; prevención: regla `no-use-before-define` y un aviso de arranque fallido en
  `index.html` para errores anteriores a React.

### Fase 12 · cerrada el 27-09-2026

- Revisión de la copia: historial, favoritas, protectores y días cubiertos ya viajaban dentro del
  progreso. Los logros **no** viajaban: al restaurar se volvían a ganar con fecha de hoy y se
  anunciaban otra vez. Ahora la copia lleva su registro (campo opcional, compatible en ambos
  sentidos), combinar conserva la fecha más antigua y restaurar anota los logros antes que el
  progreso.
- Una sola lógica de restauración (`restoreBackup` en `lib/backup.ts`) para Ajustes y bienvenida.
  En un dispositivo nuevo se restaura desde la bienvenida, con vista previa.
- "Enviar copia" con la hoja de compartir del sistema (con descarga como alternativa).
- e2e del criterio de aceptación: dos contextos del navegador; el dispositivo nuevo queda con
  progreso, historial y logros idénticos, sin avisos de logros repetidos.
- Sincronización: **solo propuesta**, en `docs/SINCRONIZACION.md` (recomendación: código de
  sincronización cifrado con PHP en el mismo Hostinger). **Pendiente de la decisión del dueño.**

### Fase 13 · cerrada el 27-09-2026 · versión 1.0.0

- Lighthouse móvil (build local, red lenta simulada): rendimiento 91, accesibilidad 100, buenas
  prácticas 100 y SEO 100 (antes 92/100/100/91). El primer pintado observado bajó de 0,6 s a
  0,14 s con la pantalla de arranque, pero la nota simulada lo ata a los ~153 KB de JS inicial
  (react-dom y el vocabulario). **Pendiente para superar 95:** sacar el vocabulario del camino
  crítico (carga asíncrona de `words.json` con un estado de carga en el inicio). La CI exige ≥ 90
  para que no retroceda; el presupuesto de tamaño (`npm run budget`) frena el crecimiento.
- Pantallas diferidas (partida, repaso, relámpago, estadísticas, diccionario y el contenido de
  Ajustes), adelantadas tras el primer pintado y precacheadas.
- SEO: metadatos para compartir, `og.png`, `robots.txt`, y con `SITE_URL` canónica y `sitemap.xml`.
  Capturas del manifiesto generadas desde la app real (`npm run capture`).
- Despliegue automático por FTPS (`deploy.yml`), inactivo hasta que el dueño cargue los secretos
  (pasos en el README). Depende de un CI en verde, y el CI de la cuenta sigue en
  `startup_failure` (facturación o minutos de Actions): **resolverlo es requisito para desplegar
  automáticamente**. Mientras tanto vale el despliegue manual.
- Accesibilidad: axe en las 9 pantallas y paneles, en los dos temas, más un recorrido solo con
  teclado. Salieron dos bugs de raíz: Enter sobre un botón enfocado disparaba el atajo de la
  pantalla, y cerrar un panel porque cambió la ruta hacía retroceder el historial.
- Revisión visual (4 tamaños × 2 temas): atajos de teclado visibles en pantallas táctiles (causa:
  `cn` no resuelve conflictos de clases; ahora los componentes base exponen variantes), barra de
  la partida flotando en teléfonos altos, datos de Tu progreso cortados, vibración ofrecida en
  escritorio.
- Lección de proceso: una vista previa propia en el puerto 4173 hacía que los e2e probaran un
  build viejo (`reuseExistingServer`). Queda documentado en el README.
- CHANGELOG.md con todas las fases y versión 1.0.0 (visible al pie de Ajustes).

### Fase 14 · cerrada el 29-09-2026

- Identidad nueva en los tokens (neutros fríos, índigo–violeta, aurora, elevaciones con nombre),
  Geist + Inter y logo nuevo en favicon, íconos, arranque e imagen para compartir.
- Componentes renovados sin relieve 3D; teclas que se elevan y comprimen; cabecera de vidrio.
- Contraste AA calculado para cada par en ambos temas antes de fijar la paleta.

### Fase 15 · cerrada el 29-09-2026

- 4483 palabras nuevas (8461 en total, 17 niveles): `select_candidates.py` (frecuencia, lemas,
  sin nombres propios, flexiones, grafías británicas ni groserías) y 12 lotes traducidos y
  revisados en paralelo, validados por `translations/validate.py`; 314 descartadas con motivo.
- La categoría gramatical que eligió quien tradujo es la que manda (`pos_reviewed.json`).
- IPA de todas (21 recientes a mano), ejemplo de todas y audio de todas.
- **Voz:** gTTS bloqueó las peticiones (429) a mitad de la generación. En lugar de esperar o mezclar
  voces, todo el audio se regeneró con una voz neuronal (edge-tts, en-US-AvaNeural), con escritura
  atómica fuera de `public/` y reintentos.
- **Arquitectura:** el vocabulario y los detalles pasan a JSON aparte; `main.tsx` monta la app al
  llegar el vocabulario, y `vite/startup-preload.ts` precarga JSON y módulos en paralelo (sin
  cascada). JS inicial: de 153 KB a 113 KB con el doble de palabras.
- Lección: Tailwind escaneaba `src/data` y `public/` (clases fantasma por palabras del vocabulario y
  reconstrucción del CSS con cada audio). Se excluyen con `@source not`.

### Fase 16 · cerrada el 29-09-2026

- `lib/coach.ts`: relearn → repasos por riesgo de olvido → subir de escalón → nuevas por frecuencia
  con cupo de aprendizaje según el ritmo (afianzar 5, normal 9, acelerar 14); al acelerar, las
  nuevas se toman FAST_JUMP puestos más adelante y un acierto instantáneo en una nueva se califica
  como fácil. El ritmo sale del historial (`f` marca el primer encuentro).
- Simulación en tests: un estudiante avanzado llega más de 4 veces más lejos que uno que empieza.
- Distractores parecidos (`resemblance`) con palabras afianzadas; retención configurable.
- Prueba de nivel adaptativa (búsqueda exponencial + binaria): con 17 niveles no hacía falta
  recorrer 51 preguntas.

### Fase 17 · cerrada el 29-09-2026

- Colecciones (WordNet alineado con la traducción; objetos divididos en ropa, transporte, edificios
  y objetos; correcciones revisadas en `TOPIC_OVERRIDES`), Palabra del día, Pronúnciala (Web Speech
  API, tipos propios en env.d.ts), Tu semana y modo concentración.

### Fase 18 · cerrada el 29-09-2026 · versión 2.0.0

- Audio: 8461 pronunciaciones con voz neuronal, recortadas de silencio y a 32 kbps mono: 38 MB
  (sin comprimir habrían sido ~90 MB). El tamaño que muestra Ajustes se calcula en el build.
- Vocabulario compacto (`vite/vocabulary.ts`): columnas en vez de objetos, de 117 a 77 KB gzip;
  `words.json` sigue siendo la fuente legible y un test comprueba la ida y vuelta sin pérdidas.
- CLS de 0,11 a 0: fuentes de respaldo con las medidas de Geist e Inter (calculadas de los archivos)
  y `font-display: swap` también en ellas.
- Bienvenida pintada desde el HTML para quien entra por primera vez (plantilla generada del
  componente y comprobada por test) y prioridad baja para el código y los datos de la app.
  Medido con red lenta y CPU ×4: la bienvenida aparece a los 0,65–1 s, antes de que llegue la app.
- Lighthouse móvil (laboratorio, máquina con ruido): rendimiento 86–90, accesibilidad, buenas
  prácticas y SEO al 100. El límite es de modelo: el LCP que cuenta es el título que React vuelve a
  montar al reemplazar la plantilla. **Pendiente para exigir ≥ 90 o 95:** hidratar la primera
  pantalla (render de la app en el build y `hydrateRoot`) para que React reutilice el HTML ya
  pintado. La CI exige ≥ 85 hasta entonces.
- Lecciones: Tailwind escaneaba los datos y `public/`; los temporales de audio no deben vivir en la
  carpeta que copia el build; el servidor de desarrollo necesita agrupar los cambios masivos de audio.

### Fase 19 · cerrada el 01-10-2026 · versión 2.1.0

- Modos tarjetas y dictado: `Mode` pasa a 7 valores y `trackOf` a una tabla; la nota propia
  (`SelfRating`) entra en `gradeAnswer` y manda sobre el tiempo. `previewIntervals` calcula con el
  mismo planificador lo que mostrará cada botón. `isTypedMode` agrupa escribir y dictado.
- XP y misiones en el progreso como campos nuevos sin subir la versión del esquema: `parseProgress`
  rellena `xp` desde el historial y `missions` vacío; `mergeProgress` toma el máximo (como el
  historial). Las misiones se vigilan como los logros (`watchMissions`) y se premian en una sola
  escritura (`completeMissions`).
- `seed.ts` reúne la semilla por fecha (palabra del día y misiones comparten `daySeed`; las misiones
  barajan con `seededRng`).
- Tu camino usa las dominadas del historial (`mastered`), que es lo único con serie temporal; el
  "nivel orientativo" de la tarjeta del inicio sigue usando las reconocidas (`known`).
- Síntesis de voz: `englishVoices` ordena por naturalidad (neuronales primero) y acento
  estadounidense; el botón solo aparece cuando hay voz (`voiceschanged`).
- Lecciones: `tsc` incluye `e2e/`, así que un test con un import sin usar deja el build sin
  regenerar `dist` (los e2e probaban una versión vieja: se vio al depurar en el navegador);
  Playwright 1.63 pide Chromium 1243 y la máquina trae 1194: un `playwright.local.config.ts` con
  `executablePath` (ignorado por git) permite correr los e2e; la tecla `?` necesita que la app haya
  montado (esperar el `h1` antes de pulsar).
- Pendiente: audio grabado de las frases de ejemplo (hoy, voz del navegador); e2e en WebKit sin
  red para descargar navegadores; sincronización entre dispositivos (sigue pendiente de decisión).

### Fase 20 · cerrada el 01-10-2026 · versión 2.2.0

- Modelo: `course.ts` (tipos, parseo que descarta lo dañado sin arrastrar al resto, carga diferida
  por nivel con un almacén externo como el de los detalles), `exercises.ts` (corrección: frases
  normalizadas, un error de tecleo por cada 12 letras hasta 2 como «casi»; baraja estable de
  «ordenar» que nunca sale en el orden correcto) y `courseProgress.ts` (almacén aparte
  `tecla:course`, mejor nota manda, premio por lección y por aprobar solo la primera vez).
- Contenido: 38 lecciones y 6 exámenes escritos a mano (A1 a C2), generados a JSON desde scripts
  locales para garantizar la sintaxis. El test de contenido comprueba que cada ejercicio se
  resuelve con su propia respuesta, que las opciones no se repiten y que nada se pierde al validar.
- UI: una sola pantalla diferida (`CourseScreens.tsx`, 7 KB) con lista de niveles, nivel, lección
  (leer → practicar → resultado) y examen; `ExerciseRunner` resuelve los cuatro tipos con teclado.
  La tarjeta del inicio va en su propio chunk (el inicial había quedado 1 KB por encima del
  presupuesto).
- Bug encontrado por el e2e: `levelSummary` contaba lecciones por id sin el nivel (siempre 0).
- Pendiente: audio grabado de los ejemplos del curso (hoy, voz del navegador); más lecciones en
  B2–C2; ejercicios de comprensión lectora y auditiva; logros del curso.

### Fase 21 · cerrada el 01-10-2026 · versión 2.3.0

- Contenido: temario alineado con el de los exámenes oficiales (A1–B2: 13 lecciones; C1–C2: 11),
  cada lección con más ejemplos y ocho ejercicios; generado desde scripts locales y validado por
  test (cada ejercicio se resuelve con su respuesta, opciones distintas, mínimos por lección).
- Quizzes (`courseQuiz.ts`): preguntas al azar con semilla por momento e intento, repartidas por
  tipo; quiz mixto en turnos por nivel. Mejor nota en `tecla:course`, con copia y combinación.
- Audio grabado (`courseAudio.ts` + `scripts/generate_course_audio.py`): id por hash FNV-1a del
  texto, calculado igual en Python y en la app, con test de paridad. El plugin de versiones recorre
  `course/`, la caché no borra esas grabaciones y la descarga sin conexión las incluye. La red del
  entorno de desarrollo bloquea `speech.platform.bing.com`: las grabaciones se generan en local.
- Comprensión (`reading` y `listening`): preguntas corregidas en bloque (todas bien, una mal entre
  tres o más = casi); la escucha reproduce grabación o voz del navegador y enseña la transcripción
  al corregir. Ocho pasajes por nivel y dos por examen.
- Presupuesto: `SettingRow` a su propio módulo (Ajustes arrastraba la descarga de audio al inicio).
- Workflows: los YAML son correctos; los runs fallan en segundos sin pasos porque GitHub no arranca
  jobs con la cuenta bloqueada por un pago pendiente. Todo el pipeline (check, build, presupuesto,
  e2e en Chromium y Lighthouse) se ejecutó en local en verde; el README explica cómo desbloquearlo.
- Pendiente: generar y subir las grabaciones del curso; logros del curso; WebKit en los e2e locales
  (solo corre en la CI).

### Versión 2.4.0 · 01-10-2026 · OpenSpeak (fuera de las fases)

- Pedido del dueño: nombre más profesional (**OpenSpeak**), tema claro por defecto, primera pantalla
  más funcional y un estilo más premium, optimizado para móvil, tablet y escritorio. Detalle en el
  CHANGELOG. Los nombres internos `tecla*` se mantienen (progreso y copias de los usuarios).
- Revisión con los motores reales: WebKit (iPhone 15 y SE, iPad vertical y horizontal, MacBook) y
  Chromium (Android, tablet, Full HD). Arreglados: desborde a 320 px (columnas de grid sin
  `minmax(0, 1fr)`), el aviso de Safari a media fila y la cabecera de la partida apretada.
- WebKit en los e2e locales ya corre: en Windows necesita más tiempo y menos paralelismo
  (configurado en `playwright.config.ts`). Sus títulos se ven más finos que en Safari real porque el
  WebKit de Windows no aplica el eje de grosor de las fuentes variables.
- Pendiente: el bloqueo de GitHub (el dueño indica que es un cobro de GitHub Copilot).

### Versión 2.5.0 · 02-10-2026 · Entrenador secuencial y curso que se retoma (fuera de las fases)

- Pedido del dueño: que la sesión no se quede en bucle con palabras conocidas, que el recorrido de
  palabras avance en orden sin tener que elegir, que «Practica por tu cuenta» empiece al tocar un
  modo, una sección de «continúa donde lo dejaste», retomar el curso en el mismo punto, y más teoría,
  ejemplos, ejercicios y evaluaciones con rigor real. Detalle en el CHANGELOG.
- Causa del bucle (tres a la vez): `fresh` contaba tarjetas, no palabras, así que subir de escalón
  gastaba el cupo de nuevas; con el conjunto de trabajo lleno, la práctica libre elegía al azar
  entre todo lo visto (casi todo dominado); y los repasos vencidos iban siempre antes que lo nuevo.
  Arreglos: `isNewWord` en `progress.ts`; «aprender por adelantado» (`LEARN_AHEAD_MS`) y práctica de
  lo más frágil con `topBy` en `coach.ts`; `introducedAt` y `newSlotOpen` en la sesión
  (`scheduler.ts`), también en los niveles. Se quitó `FAST_JUMP`: el recorrido es secuencial.
- Un escalón está afianzado (`rungSettled`) tras superar un repaso espaciado, no solo con
  estabilidad: un «fácil» en una nueva da 8 días de golpe y la subía de escalón en el acto.
- Contenido del curso ampliado por nivel en paralelo y validado por test (mínimos por lección y
  examen, tipos obligatorios, sin ejercicios repetidos): 445 apartados, 2.057 ejemplos, 1.529
  ejercicios y 314 preguntas de examen. Tipos nuevos `transform` y `spot`.
- Las opciones se barajan al mostrarse (`optionOrder`, semilla por pregunta): el contenido tenía la
  correcta casi siempre en la posición 1. Las contracciones sin ambigüedad cuentan igual al corregir.
- Estado nuevo `tecla:resume` (solo en el dispositivo, fuera de las copias): última práctica y tandas
  del curso a medias. No toca las claves ni el formato de copia existentes.
- Pendiente: grabar el audio del curso (las frases nuevas se leen con la voz del navegador); el JS
  inicial queda en 124,7 de 125 KB, sin margen para otra cosa en el paquete inicial.
