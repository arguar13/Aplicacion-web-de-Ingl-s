"""Ordena src/data/words.json de la palabra más usada a la menos usada.

El orden del archivo define los niveles de la app (ver src/lib/decks.ts), así que
hay que volver a ejecutarlo cada vez que se agreguen palabras.

Frecuencias: wordfreq (subtítulos, Wikipedia, libros, noticias y redes).

    pip install wordfreq
    python scripts/rank_words.py
"""

import json
from pathlib import Path

from wordfreq import zipf_frequency

WORDS = Path(__file__).resolve().parent.parent / "src" / "data" / "words.json"


def main() -> None:
    words = json.loads(WORDS.read_text(encoding="utf-8"))
    words.sort(key=lambda w: (-zipf_frequency(w["en"], "en"), w["en"].lower()))
    lines = ",\n".join(json.dumps(w, ensure_ascii=False) for w in words)
    # newline="\n": en Windows, write_text convertiría los saltos de línea en CRLF.
    WORDS.write_text(f"[\n{lines}\n]\n", encoding="utf-8", newline="\n")
    print(f"{len(words)} palabras ordenadas. Primeras: {', '.join(w['en'] for w in words[:12])}")


if __name__ == "__main__":
    main()
