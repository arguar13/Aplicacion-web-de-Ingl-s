# Cambios

Todos los cambios importantes de Tecla. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones,
[versionado semántico](https://semver.org/lang/es/): una versión menor por fase del
[masterprompt](docs/MASTERPROMPT.md) y 1.0.0 en el lanzamiento.

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
