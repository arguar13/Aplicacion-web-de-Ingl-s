// Sube dist/ a Hostinger con ftp-deploy (el motor de FTP-Deploy-Action): solo lo que cambió desde el
// último despliegue, según el estado que guarda en el servidor, y nunca vacía la carpeta entera (los
// audios, ~22 MB, solo se suben la primera vez). Lo llama scripts/deploy.sh después de comprobar la
// carpeta de destino, que le pasa en FTP_DEPLOY_DIR.
import { deploy } from '@samkirkland/ftp-deploy'

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable ${name}.`)
  return value
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
})
