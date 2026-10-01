"""Genera public/audio/course/<hash>.mp3 para cada frase del curso (src/data/course/*.json).

Misma voz neuronal que las palabras (en-US-AvaNeural, vía edge-tts) y misma compresión que
scripts/generate_audio.py (recorte de silencio, 32 kbps mono). Cada frase se identifica por un hash
de su texto (FNV-1a de 32 bits, dos semillas, sobre UTF-8, con los espacios colapsados), igual que
calcula src/lib/courseAudio.ts: así la app sabe, sin ninguna lista, si una frase tiene grabación.

    pip install edge-tts imageio-ffmpeg
    python scripts/generate_course_audio.py            # solo las frases sin audio
    python scripts/generate_course_audio.py --all      # todas (p. ej. al cambiar de voz)
    python scripts/generate_course_audio.py --list     # cuántas frases hay y cuántas faltan
    python scripts/generate_course_audio.py --prune    # borra grabaciones de frases que ya no existen

Frases que se graban: los ejemplos de cada sección, las frases correctas de los ejercicios de
ordenar y traducir, los huecos completados de los de completar, los enunciados completados de los
de elegir (si llevan hueco) y los textos y audios de los ejercicios de comprensión. Necesita red
hacia el servicio de voz (speech.platform.bing.com).
"""

import asyncio
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import edge_tts  # noqa: E402

from generate_audio import MIN_BYTES, PARTIAL, RETRIES, VOICE, compress  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
COURSE = ROOT / "src" / "data" / "course"
AUDIO = ROOT / "public" / "audio" / "course"
CONCURRENCY = 4
SEED_A = 2166136261
SEED_B = (0x811C9DC5 ^ 0x5BD1E995) & 0xFFFFFFFF


def fnv1a(text: str, seed: int) -> int:
    value = seed & 0xFFFFFFFF
    for byte in text.encode("utf-8"):
        value ^= byte
        value = (value * 16777619) & 0xFFFFFFFF
    return value


def normalize(text: str) -> str:
    return " ".join(text.split())


def audio_id(text: str) -> str:
    """Igual que courseAudioId en src/lib/courseAudio.ts (sin el prefijo course/)."""
    normalized = normalize(text)
    return f"{fnv1a(normalized, SEED_A):08x}{fnv1a(normalized, SEED_B):08x}"


def exercise_sentences(exercise: dict) -> list[str]:
    kind = exercise.get("type")
    if kind == "order":
        return [" ".join(exercise["words"])]
    if kind == "translate":
        return [exercise["answers"][0]]
    if kind == "fill":
        return [exercise["prompt"].replace("___", exercise["answers"][0], 1)]
    if kind == "choice" and "___" in exercise.get("prompt", ""):
        return [exercise["prompt"].replace("___", exercise["options"][exercise["answer"]], 1)]
    if kind in ("reading", "listening"):
        return [exercise["text"]]
    return []


def course_sentences() -> dict[str, str]:
    """hash → frase, de todos los niveles (una frase repetida es una sola grabación)."""
    sentences: dict[str, str] = {}
    for path in sorted(COURSE.glob("*.json")):
        level = json.loads(path.read_text(encoding="utf-8"))
        for lesson in level.get("lessons", []):
            for section in lesson.get("sections", []):
                for example in section.get("examples", []):
                    sentences[audio_id(example["en"])] = normalize(example["en"])
            for exercise in lesson.get("exercises", []):
                for sentence in exercise_sentences(exercise):
                    sentences[audio_id(sentence)] = normalize(sentence)
        for exercise in level.get("exam", []):
            for sentence in exercise_sentences(exercise):
                sentences[audio_id(sentence)] = normalize(sentence)
    return sentences


def needs_audio(hash_id: str) -> bool:
    path = AUDIO / f"{hash_id}.mp3"
    return not path.exists() or path.stat().st_size < MIN_BYTES


async def synthesize(hash_id: str, text: str, semaphore: asyncio.Semaphore) -> bool:
    target = AUDIO / f"{hash_id}.mp3"
    partial = PARTIAL / f"course-{hash_id}.mp3.part"
    async with semaphore:
        for attempt in range(RETRIES):
            try:
                await edge_tts.Communicate(text, VOICE).save(str(partial))
                compressed = partial.with_suffix(".mp3.small")
                await asyncio.to_thread(compress, partial, compressed)
                if compressed.stat().st_size < MIN_BYTES:
                    raise RuntimeError("audio demasiado corto")
                compressed.replace(target)
                partial.unlink(missing_ok=True)
                return True
            except Exception as error:  # red, servicio o archivo vacío: se reintenta
                await asyncio.sleep(2**attempt)
                if attempt == RETRIES - 1:
                    print(f"  sin audio: {text} ({error})", flush=True)
    return False


async def main() -> None:
    sentences = course_sentences()
    AUDIO.mkdir(parents=True, exist_ok=True)
    PARTIAL.mkdir(exist_ok=True)
    pending = {h: t for h, t in sentences.items() if "--all" in sys.argv or needs_audio(h)}
    if "--prune" in sys.argv:
        stale = [p for p in AUDIO.glob("*.mp3") if p.stem not in sentences]
        for path in stale:
            path.unlink()
        print(f"Borradas {len(stale)} grabaciones de frases que ya no existen")
        return
    if "--list" in sys.argv:
        print(f"{len(sentences)} frases en el curso, {len(pending)} sin grabar")
        return
    print(f"{len(pending)} frases por generar con {VOICE} (de {len(sentences)})", flush=True)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    items = list(pending.items())
    done = failed = 0
    for start in range(0, len(items), 100):
        batch = items[start : start + 100]
        results = await asyncio.gather(*(synthesize(h, t, semaphore) for h, t in batch))
        done += sum(results)
        failed += len(results) - sum(results)
        print(f"  {start + len(batch)}/{len(items)} · {failed} pendientes", flush=True)
    note = f", {failed} pendientes (vuelve a ejecutar para completarlas)" if failed else ""
    print(f"Listo: {done} generadas{note}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    asyncio.run(main())
