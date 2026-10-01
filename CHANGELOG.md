# Cambios

Todos los cambios importantes de Tecla. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones,
[versionado semántico](https://semver.org/lang/es/): una versión menor por fase del
[masterprompt](docs/MASTERPROMPT.md) y 1.0.0 en el lanzamiento.

## Sin publicar

### Cambiado

- **El despliegue pasa de GitHub Actions a GitLab CI** (`.gitlab-ci.yml`), con un runner propio en
  Docker Desktop: cada job corre en un contenedor Linux con Node 24, sin gastar minutos. El código
  se publica en GitHub y GitLab a la vez. Se retira `.github/workflows/deploy.yml`.
- El despliegue es un script independiente de la CI (`scripts/deploy.sh`): comprueba el destino y
  sube solo lo que cambió con ftp-deploy, verificando el certificado del servidor FTPS.
- Mantenimiento semanal del runner (`scripts/runner-maintenance.ps1`): renueva `node:24` y borra la
  versión anterior, sin tocar las imágenes de otros proyectos.

### Corregido

- **Despliegue por FTPS en Hostinger:** su certificado está emitido para `*.hstgr.io`, no para
  `ftp.<dominio>`, y la conexión fallaba al verificarlo. Con `FTP_TLS_NAME` = `hstgr.io` se
  conecta al servidor de siempre y el certificado se verifica contra ese nombre, sin desactivar
  la verificación. `FTP_DRY_RUN=true` simula la subida sin cambiar nada.

## 2.3.0 · 2026-10-01 · Un curso con el rigor de las certificaciones (Fase 21)

### Añadido

- **Temario ampliado** con el programa de los exámenes oficiales de cada nivel: de 38 a 74
  lecciones (A1, A2, B1 y B2 con 13; C1 y C2 con 11), cada una con más ejemplos y ocho ejercicios;
  los exámenes pasan a 23 o 24 preguntas.
- **Comprensión lectora y auditiva:** dos tipos de ejercicio nuevos (texto o audio con preguntas
  de opción múltiple), una lección de estrategias con ocho pasajes en cada nivel y un pasaje de
  cada tipo en cada examen. La escucha oculta el texto hasta corregir y muestra la transcripción.
- **Quizzes:** quiz rápido por nivel (`#/curso/<nivel>/quiz`, diez preguntas al azar, distintas
  en cada intento) y quiz mixto (`#/curso/quiz`, doce de todos los niveles). Mejor nota guardada
  (también en la copia), experiencia por acierto y 25 XP extra por un quiz perfecto.
- **Audio grabado del curso:** `scripts/generate_course_audio.py` graba cada frase con la misma voz
  neuronal que las palabras; la app prefiere la grabación y cae a la voz del navegador si no
  existe. Las grabaciones entran en la descarga sin conexión y en las versiones por contenido.

### Cambiado

- La fila de Ajustes (`SettingRow`) vive en su propio módulo, para que la copia de seguridad no
  arrastre a la carga inicial la descarga de audio del curso (paquete inicial en 124,8 KB).

## 2.2.0 · 2026-10-01 · El curso de A1 a C2 (Fase 20)

### Añadido

- **Curso de inglés** (#/curso): seis niveles del Marco Común Europeo con 38 lecciones (A1 y A2
  con 8, B1 con 8, B2 con 6, C1 y C2 con 4) y un examen por nivel. Cada lección explica el tema en
  español con ejemplos (con voz), tablas y un consejo, y lo practica con seis ejercicios.
- **Ejercicios de cuatro tipos:** elegir, completar, ordenar las palabras y traducir, con corrección
  tolerante, respuesta correcta y explicación al fallar, y teclado (1–4, Enter, Retroceso).
- **Examen por nivel** (15 o 16 preguntas), aprobado con el 80 %, con lo fallado para repasar.
- **Progreso del curso:** mejor nota por lección y examen, experiencia (ejercicio, lección la
  primera vez, examen al aprobar), siguiente paso sugerido en el inicio y copia de seguridad.
- Rutas `#/curso`, `#/curso/<nivel>`, `#/curso/<nivel>/<lección>` y `#/curso/<nivel>/examen`.

### Cambiado

- La tarjeta del curso en el inicio se carga aparte, para que el paquete inicial siga dentro del
  presupuesto.

## 2.1.0 · 2026-10-01 · Funciones profesionales de aprendizaje (Fase 19)

### Añadido

- **Modo tarjetas:** se piensa la traducción, se muestra y uno mismo se califica con las cuatro
  notas de FSRS (otra vez, difícil, bien, fácil); cada nota dice cuándo volvería la palabra. La
  nota manda sobre el tiempo de respuesta. Comparte progreso con traducir.
- **Modo dictado:** suena la palabra sin mostrarla y se escribe en inglés (comparte progreso con
  escribir).
- **Pista** en escribir y dictado: destapa las letras de una en una (nunca la última); usarla deja
  la respuesta como «casi».
- **Favoritas como mazo** (#/favoritas), con tarjeta en el inicio y atajo `F`.
- **Experiencia y rangos:** cada respuesta suma XP (más a la primera y con palabras nuevas; también
  Relámpago); ocho rangos de Novato a Leyenda. Quien ya practicaba arranca con la experiencia de su
  historial. El resumen de sesión muestra la ganada.
- **Misiones del día:** tres por día, elegidas por la fecha (las mismas en cualquier dispositivo),
  medidas de lo practicado hoy y premiadas una sola vez, con aviso.
- **Tu camino** en Tu progreso: la escala A1–C2 según las dominadas, el ritmo de los últimos 30
  días y cuándo se llegaría a cada nivel.
- **La frase de ejemplo en voz alta** con la voz del navegador (síntesis de voz; sin servidor), en
  el detalle tras responder, en la ficha y en la palabra del día, donde haya una voz en inglés.
- **Exportar a CSV** la lista filtrada del diccionario (inglés, español, categoría, IPA, ejemplo,
  estado, favorita), con BOM para Excel y listo para Anki.
- **Panel de atajos de teclado** con `?` desde cualquier pantalla (`?panel=atajos`).

### Cambiado

- El progreso guarda `xp` y `missions` (campos nuevos; las copias anteriores y combinar copias
  siguen funcionando: la XP se calcula del historial si falta y al combinar se queda el máximo).
- Las secciones de Tu progreso son regiones con nombre; Relámpago comparte fila con Favoritas.

### Seguridad

- **El despliegue ya no puede pisar otro sitio del hosting.** `FTP_SERVER_DIR` es obligatoria
  (antes subía a `public_html/` por defecto) y, antes de subir, se comprueba que el destino no
  contiene otro sitio (PHP, WordPress u otro `index.html`); si lo contiene, se cancela. Documentado
  el despliegue en un subdominio con una cuenta FTP limitada a su carpeta.

## 2.0.0 · 2026-09-29 · Segunda etapa (Fases 14 a 18)

### Añadido

- **Sesión inteligente** (#/sesion), la acción principal del inicio: un entrenador decide cada
  ronda (lo fallado vuelve, repasos por riesgo de olvido, escalera de habilidades reconocer →
  recordar → escuchar → escribir y palabras nuevas por frecuencia) a un ritmo que se adapta
  (afianzar, normal, acelerar). Con palabras afianzadas, distractores parecidos.
- **Vocabulario ampliado** de 3978 a 8461 palabras (17 niveles), con traducción revisada, ejemplo,
  IPA y audio.
- **Voz neuronal** (en-US-AvaNeural) para todas las palabras.
- **Colecciones** (#/colecciones): 19 temas generados con WordNet y el sentido de cada traducción;
  opciones del mismo tema.
- **Palabra del día**, **Pronúnciala** (reconocimiento de voz del navegador), **Tu semana** en Tu
  progreso y **modo concentración** (#/enfoque, 5 minutos).
- Ajustes: intensidad del repaso (retención 85/90/95 %) y nivel de partida de la sesión
  inteligente.

### Cambiado

- **Rediseño moderno:** neutros fríos, acento índigo–violeta, Geist e Inter, elevaciones suaves,
  cabecera de vidrio y logo nuevo.
- **Prueba de nivel adaptativa:** 1, 2, 4, 8… y afina; como mucho unas 20 palabras.
- El vocabulario y los detalles se sirven como JSON aparte (el JS inicial bajó de 153 a 113 KB con
  el doble de palabras).
- Las tarjetas de nivel tienen un nombre accesible corto ("Nivel 3, Cotidiano").
- El vocabulario se descarga en formato compacto (77 KB en vez de 117) y la bienvenida se pinta desde
  el HTML para quien entra por primera vez.
- El inicio muestra 6 niveles y "Ver los 17 niveles".
- Audio comprimido: 38 MB para las 8461 palabras.

### Corregido

- La llegada de las fuentes desplazaba la pantalla (CLS 0,11): ahora las de respaldo tienen sus
  medidas.
- Tailwind escaneaba los datos y el audio: generaba clases por palabras del vocabulario y
  reconstruía el CSS con cada audio nuevo.

## 1.0.0 · 2026-09-27 · Lanzamiento (Fase 13)

### Añadido

- Despliegue automático a Hostinger por FTPS tras un CI en verde (`.github/workflows/deploy.yml`),
  documentado en el README; se activa con los secretos del repositorio.
- SEO y compartir: Open Graph y Twitter, imagen para compartir, `robots.txt`, `sitemap.xml` y URL
  canónica (con `SITE_URL` en el build).
- Capturas en el manifiesto para la instalación enriquecida (`npm run capture`).
- Pantalla de arranque en el HTML: el logo se pinta sin esperar a la app.
- Presupuesto de tamaño del build (`npm run budget`) y Lighthouse en CI (rendimiento ≥ 90;
  accesibilidad, buenas prácticas y SEO al 100).
- Auditoría de accesibilidad en e2e: axe en todas las pantallas en tema claro y oscuro, y
  recorrido solo con teclado.
- La versión de la app, al pie de Ajustes.

### Cambiado

- Las pantallas secundarias y el contenido de Ajustes se cargan al abrirlos: arranque más ligero.
- La barra de la partida queda bajo el encabezado en teléfonos altos.
- Tu progreso reparte sus cinco datos en dos filas desde tableta.

### Corregido

- Los atajos de teclado aparecían en pantallas táctiles.
- Enter sobre un botón enfocado disparaba también el atajo de la pantalla.
- Pasar de un panel a otro (ficha → Ajustes) cerraba el nuevo.
- El ajuste de vibración aparecía en escritorio, donde no vibra nada.

## 0.12.0 · 2026-09-27 · Datos seguros y portabilidad (Fase 12)

### Añadido

- La copia de seguridad incluye los logros con su fecha; al combinar se conserva la más antigua.
- Restaurar una copia desde la bienvenida de un dispositivo nuevo.
- "Enviar copia" con la hoja de compartir del sistema.
- Propuesta de sincronización entre dispositivos, pendiente de decisión
  ([docs/SINCRONIZACION.md](docs/SINCRONIZACION.md)).

### Corregido

- Al restaurar una copia, los logros se volvían a anunciar con fecha de hoy.

## 0.11.0 · 2026-09-27 · Motivación (Fase 11)

### Añadido

- Bienvenida de primer uso con meta diaria y prueba de nivel.
- Trece logros con medallas propias, avisos y vitrina.
- Protectores de racha y aviso de racha en riesgo.
- Sonidos, vibración y celebraciones proporcionales (con movimiento reducido, sin animaciones).
- Recordatorio diario como evento de calendario (.ics).
- Ajustes organizados por secciones.

## 0.10.0 · 2026-09-27 · Estadísticas y diccionario (Fase 10)

### Añadido

- Pantalla Tu progreso: mapa de calor, dominadas en el tiempo, precisión semanal, avance por nivel
  y previsión.
- Diccionario con búsqueda en los dos idiomas, filtros y ficha de cada palabra (favoritas y
  "ya la sé").
- Historial de respuestas.

## 0.9.0 · 2026-09-27 · Modos de práctica (Fase 9)

### Añadido

- Modos escuchar, escribir (con "¡casi!" y corrección letra por letra) y completar la frase, con
  progreso por habilidad.
- Relámpago: 60 segundos contra el reloj, con récord.

## 0.8.0 · 2026-09-27 · Motor de aprendizaje (Fase 8)

### Añadido

- Repaso espaciado FSRS, con migración del progreso Leitner.
- Meta diaria, límite de palabras nuevas, resumen de sesión, repaso del día y "Mis difíciles".

## 0.7.0 · 2026-09-27 · Vocabulario enriquecido (Fase 7)

### Añadido

- Pronunciación IPA, formas irregulares y una frase de ejemplo por palabra.
- Pronunciación lenta sin cambio de tono.

### Cambiado

- Las categorías gramaticales se deciden por la primera acepción.

## 0.6.0 · 2026-09-27 · Cimientos (Fase 6)

### Añadido

- Rutas con historial: el botón atrás recorre la app.
- Progreso versionado con validación, migraciones y respaldo; copias de seguridad.
- Audio versionado por contenido y descargable para usar sin conexión desde la primera visita.
- Pantalla de error, linter con tipos, Prettier, CI, hook de pre-commit y e2e con Playwright.

### Corregido

- Distractores de otra categoría gramatical, fáciles de descartar.
- Audio regenerado que seguía viejo hasta 30 días en caché.

## 0.1.0 · 2026-09-26 · Base (Fases 1 a 5)

### Añadido

- Juego de vocabulario con 3978 palabras por frecuencia en 8 niveles, progreso guardado y repaso
  espaciado, modo español → inglés, ajustes y PWA instalable que funciona sin conexión.
