// Sube dist/ a Hostinger por FTPS, solo lo que cambió desde el último despliegue. Lo llama
// scripts/deploy.sh después de comprobar la carpeta de destino, que le pasa en FTP_DEPLOY_DIR.
//
// - Estado: el servidor guarda el hash de cada archivo publicado (.tecla-deploy.json). Se guarda
//   también durante la subida, así que un despliegue cortado retoma donde quedó.
// - Hostinger corta las sesiones FTP largas: cada conexión se reabre y reintenta el archivo.
// - Orden: primero los archivos nuevos, después las entradas (index.html, sw.js, manifiesto) y al
//   final los borrados, para que el sitio publicado nunca apunte a algo que aún no subió.
// - TLS: el certificado de Hostinger es *.hstgr.io y no hay ningún nombre de ese dominio que apunte
//   al servidor. Con FTP_TLS_NAME se conecta a FTP_SERVER y se verifica contra ese nombre.
//
// Variables: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD, FTP_DEPLOY_DIR, FTP_PROTOCOL (ftps por
// defecto, ftps-legacy o ftp), FTP_TLS_NAME (opcional) y FTP_DRY_RUN=true (muestra qué cambiaría).
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { EOL } from 'node:os'
import path from 'node:path'
import { Readable, Writable } from 'node:stream'
import tls from 'node:tls'
import { Client } from 'basic-ftp'

const LOCAL_DIR = 'dist'
const STATE_FILE = '.tecla-deploy.json'
const ENTRY_FILES = new Set(['index.html', 'sw.js', 'registerSW.js', 'manifest.webmanifest'])
const CONNECTIONS = 3
const ATTEMPTS = 6
const SAVE_EVERY = 200

const log = (line) => process.stdout.write(`${line}${EOL}`)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable ${name}.`)
  return value
}

const server = required('FTP_SERVER')
const user = required('FTP_USERNAME')
const password = required('FTP_PASSWORD')
const protocol = process.env.FTP_PROTOCOL || 'ftps'
const tlsName = process.env.FTP_TLS_NAME
const dryRun = process.env.FTP_DRY_RUN === 'true'
const remoteDir = required('FTP_DEPLOY_DIR')
  .replace(/^\.\/?/, '')
  .replace(/\/?$/, '')
const remotePath = (file) => (remoteDir ? `${remoteDir}/${file}` : file)

const secure = { ftps: true, 'ftps-legacy': 'implicit', ftp: false }[protocol]
if (secure === undefined) throw new Error(`FTP_PROTOCOL no válido: ${protocol}`)
const secureOptions = tlsName
  ? {
      servername: tlsName,
      checkServerIdentity: (_host, cert) => tls.checkServerIdentity(tlsName, cert),
    }
  : {}

// Hash de cada archivo de dist/, con rutas relativas y separadas por "/". Lectura síncrona: son
// miles de archivos pequeños (~40 MB) y abrirlos todos a la vez agota los descriptores (EMFILE).
function localFiles() {
  const hashed = readdirSync(LOCAL_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = path.join(entry.parentPath, entry.name)
      const hash = createHash('sha256').update(readFileSync(full)).digest('hex')
      return [path.relative(LOCAL_DIR, full).split(path.sep).join('/'), hash]
    })
  return new Map(hashed.toSorted(([a], [b]) => a.localeCompare(b)))
}

// Una conexión FTP que se reabre sola: Hostinger cierra las sesiones largas sin aviso.
class Connection {
  client = new Client(60_000)
  home = '/'

  // Las rutas son relativas a la carpeta inicial de la cuenta, que se apunta para volver a ella.
  async open() {
    this.client.close()
    this.client = new Client(60_000)
    await this.client.access({ host: server, user, password, secure, secureOptions })
    this.home = await this.client.pwd()
  }

  // ensureDir entra en la carpeta que crea: se vuelve a la inicial.
  async ensureDir(dir) {
    await this.client.ensureDir(dir)
    await this.client.cd(this.home)
  }

  async run(label, task, attempt = 1) {
    try {
      if (this.client.closed) await this.open()
      return await task()
    } catch (error) {
      if (attempt >= ATTEMPTS) throw new Error(`${label}: ${error.message}`, { cause: error })
      log(`  ${label}: ${error.message}. Reintento ${attempt} de ${ATTEMPTS - 1}…`)
      this.client.close()
      await sleep(1000 * attempt)
      return this.run(label, task, attempt + 1)
    }
  }

  close() {
    this.client.close()
  }
}

async function readState(connection) {
  const chunks = []
  const sink = new Writable({
    write(chunk, _encoding, done) {
      chunks.push(chunk)
      done()
    },
  })
  try {
    await connection.client.downloadTo(sink, remotePath(STATE_FILE))
  } catch (error) {
    if (error.code === 550) return {}
    throw error
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')).files ?? {}
}

const local = localFiles()
const main = new Connection()
await main.open()
if (remoteDir) await main.ensureDir(remoteDir)
const state = await readState(main)

const changed = [...local.keys()].filter((file) => state[file] !== local.get(file))
const assets = changed.filter((file) => !ENTRY_FILES.has(file))
const entries = changed.filter((file) => ENTRY_FILES.has(file))
const removed = Object.keys(state).filter((file) => !local.has(file))

log(`Archivos locales: ${local.size}. Por subir: ${changed.length}. Por borrar: ${removed.length}.`)
if (dryRun) {
  for (const file of [...assets, ...entries]) log(`  subiría ${file}`)
  for (const file of removed) log(`  borraría ${file}`)
  main.close()
  process.exit(0)
}

let saving = Promise.resolve()
function saveState() {
  const body = JSON.stringify({ updated: new Date().toISOString(), files: state })
  saving = saving.then(() =>
    main.run('guardar el estado', () => main.client.uploadFrom(Readable.from([body]), remotePath(STATE_FILE))),
  )
  return saving
}

// Vacía una cola con una conexión, un archivo detrás de otro.
async function drain(queue, connection, handle) {
  const file = queue.shift()
  if (file === undefined) return
  await connection.run(file, () => handle(file, connection))
  await drain(queue, connection, handle)
}

const createdDirs = new Set(remoteDir ? [remoteDir] : [])
let uploaded = 0

async function uploadFile(file, connection) {
  const dir = path.posix.dirname(remotePath(file))
  if (dir !== '.' && !createdDirs.has(dir)) {
    await connection.ensureDir(dir)
    createdDirs.add(dir)
  }
  await connection.client.uploadFrom(path.join(LOCAL_DIR, file), remotePath(file))
  state[file] = local.get(file)
  uploaded++
  if (uploaded % SAVE_EVERY === 0) {
    log(`Subidos ${uploaded} de ${changed.length}…`)
    void saveState()
  }
}

// Sube una lista repartida en varias conexiones.
async function upload(files) {
  const queue = [...files]
  const connections = Array.from({ length: Math.min(CONNECTIONS, queue.length) }, () => new Connection())
  await Promise.all(connections.map((connection) => drain(queue, connection, uploadFile)))
  for (const connection of connections) connection.close()
  await saving
}

await upload(assets)
await upload(entries)
await drain([...removed], main, async (file) => {
  await main.client.remove(remotePath(file), true)
  delete state[file]
})
await saveState()
main.close()
log(`Despliegue completo: ${changed.length} subidos, ${removed.length} borrados.`)
