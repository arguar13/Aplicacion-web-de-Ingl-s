#!/usr/bin/env bash
# Despliega dist/ en Hostinger: comprueba que la carpeta de destino no es de otro sitio y sube solo lo
# que cambió. Lo ejecuta el pipeline de GitLab (.gitlab-ci.yml) después de `npm run build`; también
# sirve a mano desde Git Bash con las mismas variables (ver "Despliegue" en el README).
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f dist/index.html ]] || {
  echo "Despliegue cancelado: falta dist/. Ejecuta npm run build antes." >&2
  exit 1
}

dir="$(bash scripts/check-deploy-target.sh)"
FTP_DEPLOY_DIR="$dir" node scripts/ftp-upload.mjs

# Con el sitio ya publicado, se avisa a los buscadores (IndexNow). Si falla, el despliegue sigue bien.
node scripts/indexnow.mjs || echo "IndexNow: no se pudo avisar a los buscadores; el despliegue está completo." >&2
