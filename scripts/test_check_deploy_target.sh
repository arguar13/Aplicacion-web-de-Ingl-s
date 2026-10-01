#!/usr/bin/env bash
# Pruebas de check-deploy-target.sh con un curl falso que devuelve el listado de cada caso.
set -euo pipefail

script="$(cd "$(dirname "$0")" && pwd)/check-deploy-target.sh"
bin="$(mktemp -d)"
trap 'rm -rf "$bin"' EXIT

# curl falso: guarda la URL pedida, imprime FAKE_LISTING y sale con FAKE_STATUS.
cat >"$bin/curl" <<'EOF'
#!/usr/bin/env bash
for arg; do url="$arg"; done
echo "$url" >"$FAKE_URL_FILE"
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

if ((failures)); then
  echo "$failures prueba(s) fallaron."
  exit 1
fi
echo "Todas las pruebas pasaron."
