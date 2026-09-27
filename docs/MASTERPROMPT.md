# Masterprompt · Tecla, fases 6 a 13

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
