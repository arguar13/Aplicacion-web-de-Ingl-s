#!/usr/bin/env bash
# Comprueba la carpeta de destino en Hostinger antes de subir dist/, para que el despliegue nunca
# pise otro sitio del mismo hosting (p. ej. un WordPress en public_html):
#
# - FTP_SERVER_DIR es obligatoria: no hay carpeta por defecto que adivinar.
# - El destino debe estar vacío, no existir aún o contener ya Tecla. Tecla es estática y nunca
#   sube PHP, así que un .php (salvo default.php, la página de bienvenida de Hostinger), una carpeta
#   wp-* o un index.html sin el manifiesto de Tecla significan que ahí vive otra cosa.
#
# Entrada (variables de entorno): FTP_SERVER, FTP_USERNAME, FTP_PASSWORD, FTP_SERVER_DIR (relativa
# a la carpeta inicial de la cuenta FTP; "./" es esa misma carpeta) y FTP_PROTOCOL (ftps por
# defecto, ftps-legacy o ftp, como FTP-Deploy-Action). Opcional: FTP_TLS_NAME, el nombre contra el
# que se verifica el certificado cuando no coincide con FTP_SERVER (en Hostinger, hstgr.io; ver
# scripts/ftp-upload.mjs).
# Salida: la carpeta terminada en "/" (lo que espera ftp-deploy) como única línea de stdout; los
# mensajes van a stderr. La usa scripts/deploy.sh.
set -euo pipefail

fail() {
  echo "Despliegue cancelado: $1" >&2
  exit 1
}

dir="${FTP_SERVER_DIR:-}"
[[ -n "$dir" ]] || fail "Falta la variable FTP_SERVER_DIR (en GitLab: Settings → CI/CD → Variables). Indica la carpeta del sitio de Tecla, p. ej. public_html/ingles/, o ./ si la cuenta FTP ya empieza en ella."
[[ "$dir" == */ ]] || dir="$dir/"

case "${FTP_PROTOCOL:-ftps}" in
  ftps) scheme=ftp tls=(--ssl-reqd) ;;
  ftps-legacy) scheme=ftps tls=() ;;
  ftp) scheme=ftp tls=() ;;
  *) fail "FTP_PROTOCOL no válido: '$FTP_PROTOCOL' (usa ftps, ftps-legacy o ftp)." ;;
esac

# En una URL FTP la ruta es relativa a la carpeta inicial; una ruta absoluta empieza por %2F.
path="${dir#./}"
[[ "$path" == /* ]] && path="%2F${path#/}"
path="${path// /%20}"

# Con FTP_TLS_NAME, la URL lleva ese nombre (contra él se verifica el certificado) y --connect-to
# dirige la conexión a FTP_SERVER.
host="$FTP_SERVER"
if [[ -n "${FTP_TLS_NAME:-}" ]]; then
  [[ "${FTP_PROTOCOL:-ftps}" == ftps ]] || fail "FTP_TLS_NAME solo se admite con FTP_PROTOCOL=ftps."
  host="$FTP_TLS_NAME"
  tls+=(--connect-to "$FTP_TLS_NAME:21:$FTP_SERVER:21")
fi
url="$scheme://$host/$path"

err="$(mktemp)"
trap 'rm -f "$err"' EXIT
status=0
listing="$(curl --silent --show-error --list-only --connect-timeout 30 --max-time 120 \
  "${tls[@]}" --user "$FTP_USERNAME:$FTP_PASSWORD" "$url" 2>"$err")" || status=$?

case "$status" in
  0) ;;
  # La carpeta aún no existe (o no se puede entrar): FTP-Deploy-Action la crea al subir.
  9 | 78) listing="" ;;
  *) fail "No se pudo listar $dir en el servidor (curl $status): $(cat "$err")" ;;
esac

others=()
has_index=false
has_manifest=false
while IFS= read -r name; do
  name="${name%$'\r'}"
  name="${name##*/}"
  case "$name" in
    '' | . | .. | default.php) ;;
    index.html) has_index=true ;;
    manifest.webmanifest) has_manifest=true ;;
    *.php | wp-*) others+=("$name") ;;
  esac
done <<<"$listing"
if $has_index && ! $has_manifest; then others+=("index.html (sin manifest.webmanifest)"); fi

if ((${#others[@]})); then
  fail "La carpeta $dir contiene otro sitio (${others[*]:0:5}). Elige la carpeta del sitio de Tecla en FTP_SERVER_DIR o usa una cuenta FTP limitada a ella."
fi

echo "Destino comprobado: $dir no contiene otro sitio." >&2
echo "$dir"
