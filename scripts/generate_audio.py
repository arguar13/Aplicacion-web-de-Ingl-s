"""Genera public/audio/<id>.mp3 para cada palabra de src/data/words.json.

Voz: en-US-AvaNeural, una voz neuronal de Microsoft (la de "Leer en voz alta" de Edge), vía
edge-tts. Suena natural y clara, y todas las palabras usan la misma. Hasta la Fase 15 se usaba
gTTS; al ampliar el vocabulario su servicio bloqueó las peticiones (429) y se cambió de voz para
todas las palabras a la vez, para que no se mezclen dos voces.

    pip install edge-tts imageio-ffmpeg
    python scripts/generate_audio.py            # solo las palabras que no tienen audio
    python scripts/generate_audio.py --all      # todas (p. ej. al cambiar de voz)
    python scripts/generate_audio.py --compress # comprime las que aún no lo estén

Cada audio se comprime al generarse: se recorta el silencio de los extremos (dejando un margen
para que el ataque suene natural) y se codifica a 32 kbps mono, de sobra para una palabra hablada.
Así las 8000 pronunciaciones ocupan unos 35 MB en vez de casi 90 (importa para estudiar sin
conexión en el teléfono).

Cada audio se escribe en un archivo temporal (en .audio-tmp/, fuera de lo que se publica) y se
renombra al terminar: si el proceso se corta, no queda un MP3 a medias que la próxima vez se daría
por bueno. Los errores de red se reintentan con esperas crecientes; lo que no se pueda generar
queda pendiente para la próxima ejecución.
"""

import asyncio
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import edge_tts
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
WORDS = ROOT / "src" / "data" / "words.json"
AUDIO = ROOT / "public" / "audio"
# Los archivos a medio escribir van fuera de public/: el build copia esa carpeta y no debe ver
# temporales. En el mismo disco, para que el renombrado final sea atómico.
PARTIAL = ROOT / ".audio-tmp"
VOICE = "en-US-AvaNeural"
# Peticiones a la vez: rápido sin abusar del servicio.
CONCURRENCY = 6
RETRIES = 5
# Hasta la palabra más corta ("a", comprimida) supera 1 KB: menos que esto es un archivo cortado.
MIN_BYTES = 1200
BITRATE = "32k"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
# Silencio de los extremos: se recorta dejando 50 ms delante y 80 ms detrás.
TRIM = (
    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,"
    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse"
)


def compress(source: Path, target: Path) -> None:
    """Recorta el silencio y codifica a BITRATE mono; escribe en `target`."""
    subprocess.run(
        [FFMPEG, "-loglevel", "error", "-y", "-i", str(source), "-af", TRIM, "-ac", "1", "-ar", "24000", "-b:a", BITRATE, "-f", "mp3", str(target)],
        check=True,
    )


def is_compressed(path: Path) -> bool:
    """Su pista de audio ya está a BITRATE (comprimirla otra vez solo perdería calidad). Se mira la
    pista y no el total del archivo, que suma las cabeceras y en palabras cortas sale más alto."""
    info = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True).stderr
    stream = re.search(r"Audio: mp3.*?(\d+) kb/s", info)
    return stream is not None and stream.group(1) == BITRATE[:-1]


def needs_audio(word_id: str) -> bool:
    path = AUDIO / f"{word_id}.mp3"
    return not path.exists() or path.stat().st_size < MIN_BYTES


async def synthesize(word: dict, semaphore: asyncio.Semaphore) -> bool:
    target = AUDIO / f"{word['id']}.mp3"
    partial = PARTIAL / f"{word['id']}.mp3.part"
    async with semaphore:
        for attempt in range(RETRIES):
            try:
                await edge_tts.Communicate(word["en"], VOICE).save(str(partial))
                compressed = partial.with_suffix(".mp3.small")
                await asyncio.to_thread(compress, partial, compressed)
                if compressed.stat().st_size < MIN_BYTES:
                    raise RuntimeError("audio demasiado corto")
                compressed.replace(target)
                partial.unlink(missing_ok=True)
                return True
            except Exception as error:  # red, servicio o archivo vacío: se reintenta
                await asyncio.sleep(2 ** attempt)
                if attempt == RETRIES - 1:
                    print(f"  sin audio: {word['en']} ({error})", flush=True)
    return False


def compress_existing(words: list[dict]) -> None:
    """Comprime los audios que aún no lo estén (los generados antes de comprimir al vuelo)."""

    def compress_one(word: dict) -> bool:
        path = AUDIO / f"{word['id']}.mp3"
        if not path.exists() or is_compressed(path):
            return False
        small = PARTIAL / f"{word['id']}.mp3.small"
        compress(path, small)
        small.replace(path)
        return True

    # ffmpeg es un proceso aparte: varios a la vez aprovechan todos los núcleos.
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
        results = list(pool.map(compress_one, words))
    print(f"Listo: {sum(results)} comprimidas")


async def main() -> None:
    words = json.loads(WORDS.read_text(encoding="utf-8"))
    PARTIAL.mkdir(exist_ok=True)
    if "--compress" in sys.argv:
        compress_existing(words)
        return
    pending = words if "--all" in sys.argv else [w for w in words if needs_audio(w["id"])]
    print(f"{len(pending)} palabras por generar con {VOICE}", flush=True)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    done = 0
    failed = 0
    for batch_start in range(0, len(pending), 200):
        batch = pending[batch_start : batch_start + 200]
        results = await asyncio.gather(*(synthesize(word, semaphore) for word in batch))
        done += sum(results)
        failed += len(results) - sum(results)
        print(f"  {batch_start + len(batch)}/{len(pending)} · {failed} pendientes", flush=True)
    pending_note = f", {failed} pendientes (vuelve a ejecutar para completarlas)" if failed else ""
    print(f"Listo: {done} generadas{pending_note}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    asyncio.run(main())
