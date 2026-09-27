# Sincronización entre dispositivos · propuesta

> Estado: **propuesta para decidir**. No hay nada implementado. Ninguna opción con servidor o de
> pago se construye sin la aprobación del dueño del proyecto.

## Punto de partida

Hoy el progreso vive solo en el dispositivo, y pasa de uno a otro con la **copia de seguridad**
(un archivo JSON). La copia lleva el progreso, el historial, los logros y los ajustes, y se puede
restaurar desde Ajustes o desde la bienvenida de un dispositivo nuevo. La lógica de combinar ya
existe y tiene tests (`mergeProgress`, `mergeEvents`, `mergeUnlocks`): cada palabra conserva su
versión más avanzada, los días se unen y cada logro guarda su fecha más antigua. Cualquier
sincronización se apoya en esa misma lógica. El servidor solo guarda y entrega datos; no decide
nada.

Tamaño de los datos: de 50 a 400 KB por usuario (hasta ~16.000 tarjetas y 5.000 respuestas), y
de 10 a 80 KB comprimido.

## Opciones

|                       | A. Sin servidor (mejorar la copia)                         | B. Código de sincronización en Hostinger                                                       | C. Cuentas en Hostinger (PHP + MySQL)                           | D. Servicio gestionado (Supabase / Firebase)                                          |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Qué ve el usuario     | "Enviar copia" al hacerla y "abrir con Tecla" al recibirla | Un código de 12 caracteres (o QR) que se escribe en el otro dispositivo; desde ahí, automático | Correo y enlace mágico; automático                              | Correo o Google; automático                                                           |
| Costo mensual         | 0                                                          | 0 (usa el hosting actual)                                                                      | 0 (usa el hosting actual)                                       | 0 hasta cierto uso; Supabase Pro 25 USD/mes, Firebase Blaze por consumo               |
| Datos personales      | Ninguno                                                    | Ninguno: el contenido va cifrado en el dispositivo y el servidor no puede leerlo               | Correos (aviso de privacidad y derecho de borrado obligatorios) | Correos, en un tercero (EE. UU.)                                                      |
| Trabajo estimado      | 1–2 días                                                   | 4–6 días                                                                                       | 8–12 días                                                       | 5–8 días                                                                              |
| Mantenimiento         | Nulo                                                       | Bajo: un script PHP y una tabla                                                                | Medio: cuentas, correo transaccional, seguridad                 | Bajo, pero dependes del proveedor (el plan gratis de Supabase se pausa sin actividad) |
| Funciona sin conexión | Sí                                                         | Sí: sincroniza al volver la red                                                                | Sí                                                              | Sí                                                                                    |
| Riesgos               | Sigue siendo manual                                        | Perder el código significa empezar de cero en ese dispositivo (el local sigue intacto)         | Entregabilidad del correo y ataques a cuentas                   | Cambios de precio o de condiciones del proveedor                                      |

### A. Sin servidor: mejorar la copia (sin costo; ya empezada)

- ✅ **"Enviar copia"** (Fase 12): donde el sistema comparte archivos, Ajustes abre su hoja de
  compartir (WhatsApp, correo, AirDrop, Drive, Guardar en Archivos). Si el sistema falla, la copia
  se descarga. El dispositivo nuevo la restaura desde la bienvenida.
- **Recordatorio de copia** más proactivo, por ejemplo tras cada logro importante.
- Pasar la copia por código QR **no es viable**: un QR aguanta unos 3 KB y la copia comprimida
  ocupa de 10 a 80 KB.

### B. Código de sincronización cifrado en Hostinger (recomendada)

- El primer dispositivo genera una clave aleatoria y la muestra como código o QR. El otro
  dispositivo la introduce.
- Del código se derivan dos cosas: el **identificador** del hueco en el servidor y la **clave de
  cifrado** (AES-GCM con Web Crypto). El servidor guarda un bloque cifrado por código, con su
  versión.
- **API mínima** en PHP: `GET /sync.php?id=…` y `PUT /sync.php?id=…` con control de versión (si
  otro dispositivo escribió antes, el cliente descarga, combina con `mergeProgress` y reintenta).
  Límite de tamaño y de peticiones por IP.
- **Cuándo sincroniza:** al abrir la app, al terminar una sesión y al recuperar la conexión.
- **Por qué es la recomendada:** no guarda datos personales, cuesta cero y reutiliza la lógica de
  combinar que ya está probada. Además no bloquea pasar a cuentas en el futuro.

### C. Cuentas propias en Hostinger

Da la misma sincronización que B, identificando al usuario con su correo (enlace mágico) en lugar
de un código. Suma envío de correo (SMTP de Hostinger), sesiones, protección contra abuso y
obligaciones de privacidad. Tiene sentido si más adelante hay funciones sociales (clases,
profesores, ranking).

### D. Servicio gestionado

Supabase (Auth + Postgres) o Firebase (Auth + Firestore) resuelven cuentas y almacenamiento sin
escribir backend. A cambio: dependencia de un tercero, datos fuera de Hostinger, un SDK de 30 a
100 KB más en la app y posibles costos al crecer.

## Qué necesito del dueño para avanzar

1. Elegir una opción. Recomiendo completar **A** (ya empezada) y construir **B** cuando se apruebe.
2. Para B o C: confirmar que el plan de Hostinger incluye PHP 8 y MySQL, y crear la base de
   datos (usuario y contraseña se guardan fuera del repositorio).
3. Para C o D: aprobar el texto de privacidad que se mostrará a los usuarios.
