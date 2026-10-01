# Mantenimiento semanal del runner de Tecla en Docker Desktop (tarea programada
# «Tecla: mantenimiento del runner»). Renueva node:24, la imagen de los jobs, para recibir los
# parches de seguridad (el runner usa pull_policy if-not-present y no la actualiza solo) y borra la
# versión anterior para que el disco no crezca. Solo toca esa imagen: el resto de imágenes y
# contenedores del PC no se tocan. Si Docker Desktop no está abierto, no hace nada.
$image = 'node:24'

docker info *> $null
if ($LASTEXITCODE -ne 0) { exit 0 }

$old = docker image inspect $image --format '{{.Id}}' 2> $null
docker pull --quiet $image | Out-Null
if ($LASTEXITCODE -ne 0) { exit 1 }
$new = docker image inspect $image --format '{{.Id}}'

# Si justo un job la está usando, docker rmi falla y la versión vieja queda sin etiqueta
# (`docker images --filter dangling=true` la muestra; `docker rmi <id>` la borra).
if ($old -and $old -ne $new) { docker rmi $old | Out-Null }
