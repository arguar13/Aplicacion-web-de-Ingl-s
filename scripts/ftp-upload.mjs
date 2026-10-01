// Sube dist/ a Hostinger con ftp-deploy (el motor de FTP-Deploy-Action): solo lo que cambió desde el
// último despliegue, según el estado que guarda en el servidor, y nunca vacía la carpeta entera (los
// audios, ~22 MB, solo se suben la primera vez). Lo llama scripts/deploy.sh después de comprobar la
// carpeta de destino, que le pasa en FTP_DEPLOY_DIR.
import tls from 'node:tls'
import { deploy } from '@samkirkland/ftp-deploy'

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable ${name}.`)
  return value
}

// Hostinger certifica sus servidores FTP como *.hstgr.io, pero no publica ningún nombre de ese
// dominio que apunte al servidor. Con FTP_TLS_NAME se conecta a FTP_SERVER y el certificado se
// verifica contra ese nombre: la cadena y el nombre se siguen validando, no se rebaja nada.
// ftp-deploy no expone las opciones TLS, así que se fijan en tls.connect, que basic-ftp usa para
// la conexión de control y para cada conexión de datos (FTPS explícito).
const tlsName = process.env.FTP_TLS_NAME
if (tlsName) {
  const connect = tls.connect
  tls.connect = (options, ...rest) =>
    connect(
      {
        ...options,
        servername: tlsName,
        checkServerIdentity: (_host, cert) => tls.checkServerIdentity(tlsName, cert),
      },
      ...rest,
    )
}

await deploy({
  server: required('FTP_SERVER'),
  username: required('FTP_USERNAME'),
  password: required('FTP_PASSWORD'),
  protocol: process.env.FTP_PROTOCOL || 'ftps',
  // Verifica el certificado del servidor, igual que la comprobación del destino con curl.
  security: 'strict',
  'local-dir': './dist/',
  'server-dir': required('FTP_DEPLOY_DIR'),
  'dangerous-clean-slate': false,
  // FTP_DRY_RUN=true conecta y muestra qué subiría o borraría, sin cambiar nada en el servidor.
  'dry-run': process.env.FTP_DRY_RUN === 'true',
})
