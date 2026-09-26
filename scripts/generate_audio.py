"""Genera public/audio/<id>.mp3 para cada palabra de src/data/words.json que aún no tenga audio.

Usa gTTS (la voz inglesa de Google Translate), la misma con la que se crearon los audios
existentes, para que todas las palabras suenen igual.

    pip install gtts
    python scripts/generate_audio.py
"""

import json
import time
from pathlib import Path

from gtts import gTTS

ROOT = Path(__file__).resolve().parent.parent
WORDS = ROOT / "src" / "data" / "words.json"
AUDIO = ROOT / "public" / "audio"
# Pausa entre peticiones para no saturar el servicio.
DELAY_SECONDS = 0.5


def main() -> None:
    words = json.loads(WORDS.read_text(encoding="utf-8"))
    pending = [w for w in words if not (AUDIO / f"{w['id']}.mp3").exists()]
    print(f"{len(pending)} palabras sin audio")

    for i, word in enumerate(pending, 1):
        gTTS(text=word["en"], lang="en").save(AUDIO / f"{word['id']}.mp3")
        print(f"  [{i}/{len(pending)}] {word['en']}")
        time.sleep(DELAY_SECONDS)


if __name__ == "__main__":
    main()
