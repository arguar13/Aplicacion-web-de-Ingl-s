#!/usr/bin/env bash
# Pruebas de check-deploy-target.sh con un curl falso que devuelve el listado de cada caso.
set -euo pipefail
# En la CI llegan las variables reales del despliegue: cada caso fija las suyas.
unset FTP_SERVER FTP_USERNAME FTP_PASSWORD FTP_SERVER_DIR FTP_PROTOCOL FTP_TLS_NAME

script="$(cd "$(dirname "$0")" && pwd)/check-deploy-target.sh"
bin="$(mktemp -d)"
trap 'rm -rf "$bin"' EXIT

# curl falso: guarda la URL pedida (y en FAKE_ARGS_FILE, si está, todos los argumentos), imprime
# FAKE_LISTING y sale con FAKE_STATUS.
cat >"$bin/curl" <<'EOF'
#!/usr/bin/env bash
for arg; do url="$arg"; done
echo "$url" >"$FAKE_URL_FILE"
[[ -z "${FAKE_ARGS_FILE:-}" ]] || printf '%s\n' "$@" >"$FAKE_ARGS_FILE"
printf '%b' "${FAKE_LISTING:-}"
exit "${FAKE_STATUS:-0}"
EOF
chmod +x "$bin/curl"

failures=0
# run <nombre> <ok|error> <FTP_SERVER_DIR> <listado> [estado de curl] [salida esperada] [url esperada]
run() {
  local name="$1" expect="$2" err url_file output status=0
  err="$(mktemp)"
  url_file="$(mktemp)"
  output="$(PATH="$bin:$PATH" FTP_SERVER=ftp.ejemplo.com FTP_USERNAME=u FTP_PASSWORD=p \
    FTP_SERVER_DIR="$3" FAKE_LISTING="$4" FAKE_STATUS="${5:-0}" FAKE_URL_FILE="$url_file" \
    bash "$script" 2>"$err")" || status=$?
  local problem=""
  if [[ "$expect" == ok && "$status" != 0 ]]; then problem="debía pasar y falló: $(cat "$err")"; fi
  if [[ "$expect" == error && "$status" == 0 ]]; then problem="debía fallar y pasó"; fi
  if [[ "$expect" == error && -n "$output" ]]; then problem="al fallar no debe imprimir carpeta: '$output'"; fi
  if [[ -n "${6:-}" && "$output" != "$6" ]]; then problem="salida '$output', se esperaba '$6'"; fi
  if [[ -n "${7:-}" && "$(cat "$url_file")" != "$7" ]]; then problem="URL '$(cat "$url_file")', se esperaba '$7'"; fi
  rm -f "$err" "$url_file"
  if [[ -n "$problem" ]]; then
    echo "FALLA  $name: $problem"
    failures=$((failures + 1))
  else
    echo "ok     $name"
  fi
}

run "sin FTP_SERVER_DIR" error "" ""
run "carpeta vacía" ok "public_html/ingles" "" 0 "public_html/ingles/" "ftp://ftp.ejemplo.com/public_html/ingles/"
run "carpeta que aún no existe" ok "public_html/ingles/" "" 9 "public_html/ingles/"
run "carpeta inicial de la cuenta" ok "./" "" 0 "./" "ftp://ftp.ejemplo.com/"
run "ruta absoluta" ok "/public_html/ingles/" "" 0 "" "ftp://ftp.ejemplo.com/%2Fpublic_html/ingles/"
run "bienvenida de Hostinger" ok "public_html/ingles/" "default.php\r\n"
run "Tecla ya desplegada" ok "public_html/ingles/" "index.html\nmanifest.webmanifest\nsw.js\nassets\n"
run "WordPress" error "public_html/" "index.php\nwp-config.php\nwp-content\nwp-admin\n"
run "carpetas wp-* sin PHP" error "public_html/" "wp-content\n"
run "otro sitio estático" error "public_html/" "index.html\nestilos.css\n"
run "listado con rutas" error "public_html/" "public_html/wp-config.php\n"
run "error de conexión" error "public_html/ingles/" "" 67

# Con FTP_TLS_NAME, la URL lleva ese nombre y --connect-to dirige la conexión al servidor real.
tls_check() {
  local name="$1" protocol="$2" expect="$3" url_file args_file status=0
  url_file="$(mktemp)"
  args_file="$(mktemp)"
  PATH="$bin:$PATH" FTP_SERVER=ftp.ejemplo.com FTP_USERNAME=u FTP_PASSWORD=p FTP_SERVER_DIR=./ \
    FTP_TLS_NAME=hstgr.io FTP_PROTOCOL="$protocol" FAKE_URL_FILE="$url_file" \
    FAKE_ARGS_FILE="$args_file" bash "$script" >/dev/null 2>&1 || status=$?
  local problem=""
  if [[ "$expect" == ok ]]; then
    [[ "$status" == 0 ]] || problem="debía pasar y falló"
    [[ "$(cat "$url_file")" == "ftp://hstgr.io/" ]] || problem="URL '$(cat "$url_file")'"
    grep -qx "hstgr.io:21:ftp.ejemplo.com:21" "$args_file" || problem="falta --connect-to"
  elif [[ "$status" == 0 ]]; then
    problem="debía fallar y pasó"
  fi
  rm -f "$url_file" "$args_file"
  if [[ -n "$problem" ]]; then
    echo "FALLA  $name: $problem"
    failures=$((failures + 1))
  else
    echo "ok     $name"
  fi
}
tls_check "nombre TLS con FTPS" ftps ok
tls_check "nombre TLS sin FTPS" ftp error

if ((failures)); then
  echo "$failures prueba(s) fallaron."
  exit 1
fi
echo "Todas las pruebas pasaron."
