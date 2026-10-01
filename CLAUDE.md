# Guía para el agente

Lo esencial para trabajar en este repositorio. La app se llama **OpenSpeak** (antes Tecla): los
nombres internos `tecla*` (claves de `localStorage`, formato de copias, runner) no se renombran. El
detalle técnico está en el [README](README.md) y la historia de cada fase en
[docs/MASTERPROMPT.md](docs/MASTERPROMPT.md) (§7, registro de avance).

## Despliegue: cómo funciona

Publicado en **https://aplicacion-ingles.armandoguar.com** (Hostinger, plan Premium Web Hosting).

- **Publicar es automático:** cada push a `main` comprueba el código, compila y publica (pipeline de
  GitLab, `.gitlab-ci.yml`). `git push origin main` sube a GitHub y a GitLab a la vez: `origin`
  tiene dos URL de push.
- **Solo sube lo que cambia:** la primera vez fueron 8.547 archivos en unos 12 minutos; un cambio
  normal sube unos pocos archivos. El estado vive en el servidor (`.tecla-deploy.json`).
- **Docker Desktop tiene que estar abierto** para que se publique: el runner de GitLab corre en el
  PC del dueño. La limpieza semanal de imágenes ya está programada y no toca sus otros proyectos.
- **GitHub sigue como copia del código,** pero su CI sale en rojo hasta que el dueño arregle allí la
  facturación (cuenta bloqueada por un pago pendiente). No afecta a la publicación.

### Piezas

- **GitLab:** proyecto privado `arguar13/aplicacion-web-de-ingles` (id 87127648). Variables en
  Settings → CI/CD → Variables, todas Protected: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
  (Masked), `FTP_SERVER_DIR=./`, `SITE_URL`, `FTP_TLS_NAME=hstgr.io`.
- **Runner:** contenedor `tecla-runner` (gitlab/gitlab-runner:v19.4.1, volumen
  `tecla-runner-config`, etiqueta `tecla`, ejecutor docker con `node:24`). En el PC hay **otro
  runner, `gitlab-runner-local`, de otro proyecto: no tocarlo.**
- **Limpieza:** tarea programada de Windows «Tecla - mantenimiento del runner» (domingos 12:00,
  `scripts/runner-maintenance.ps1`): renueva `node:24` y borra la versión anterior. **Nunca** usar
  `docker image prune -a` ni `docker system prune`: el PC tiene imágenes de otros proyectos.
- **Scripts:** `scripts/deploy.sh` → `check-deploy-target.sh` (se niega a subir si el destino tiene
  otro sitio) → `ftp-upload.mjs` (uploader propio sobre basic-ftp).

### Particularidades de Hostinger (ya resueltas; no deshacer)

- El certificado FTPS es `*.hstgr.io` y ningún nombre de ese dominio apunta al servidor:
  `FTP_TLS_NAME=hstgr.io` verifica el certificado contra ese nombre. No desactivar la verificación.
- Hostinger corta las sesiones FTP largas (cada ~300 archivos): el uploader reconecta, reintenta y
  guarda el progreso. Los reintentos en el log son normales.
- La cuenta FTP solo ve la carpeta del subdominio (`.../public_html/aplicacion-ingles`). En
  `public_html` vive el blog de data science del dueño, en modo mantenimiento: **no tocarlo nunca**.

## Normas de trabajo

- Cada cambio: `npm run check` (lo corre el hook de pre-commit), commit y push a `main`.
- Arreglar los errores de raíz, sin parches temporales.
- La interfaz tiene que ser elegante y verse bien en móvil, tablet y escritorio, en los dos temas.
- No dejar nada escuchando en el puerto 4173: los e2e lo reutilizan y probarían un build viejo.
- Las claves de `localStorage` (`tecla:*`) y el formato de las copias no se renombran: el progreso
  de los usuarios depende de ellas.
