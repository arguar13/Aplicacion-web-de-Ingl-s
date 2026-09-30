"""Suma al vocabulario las palabras traducidas en scripts/data/translations/batch-*.json.

Cada lote viene de scripts/data/candidates.json (ver select_candidates.py), traducido y revisado:
traducción, categoría gramatical de esa traducción y una frase de ejemplo. Las entradas con
"skip" (nombres propios, abreviaturas, groserías, grafías británicas…) no pasan.

Escribe:
  - src/data/words.json: las palabras nuevas al final (luego rank_words.py las ordena).
  - scripts/data/examples/ampliacion.json: sus frases de ejemplo (las lee enrich_words.py).
  - scripts/data/pos_reviewed.json: la categoría que se eligió al traducir (la respeta tag_pos.py).

    python scripts/merge_translations.py
    python scripts/rank_words.py && python scripts/tag_pos.py && python scripts/enrich_words.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORDS = ROOT / "src" / "data" / "words.json"
BATCHES = ROOT / "scripts" / "data" / "translations"
EXAMPLES = ROOT / "scripts" / "data" / "examples" / "ampliacion.json"
REVIEWED = ROOT / "scripts" / "data" / "pos_reviewed.json"

# Conservadas al traducir, pero de contexto sexual: no encajan en una app para todas las edades.
DROP = {"nudity", "penetration", "sperm"}


def write_json(path: Path, data) -> None:
    # newline="\n": en Windows, write_text convertiría los saltos de línea en CRLF.
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def main() -> None:
    words = json.loads(WORDS.read_text(encoding="utf-8"))
    known = {w["id"] for w in words}
    added, examples, reviewed = [], [], {}
    for path in sorted(BATCHES.glob("batch-*.json")):
        for entry in json.loads(path.read_text(encoding="utf-8")):
            wid = entry["id"]
            if "skip" in entry or wid in DROP or wid in known:
                continue
            known.add(wid)
            added.append({"id": wid, "en": wid, "es": entry["es"].strip(), "pos": entry["pos"]})
            examples.append({"id": wid, "en": entry["example_en"].strip(), "es": entry["example_es"].strip()})
            reviewed[wid] = entry["pos"]

    lines = ",\n".join(json.dumps(w, ensure_ascii=False) for w in words + added)
    WORDS.write_text(f"[\n{lines}\n]\n", encoding="utf-8", newline="\n")
    write_json(EXAMPLES, examples)
    write_json(REVIEWED, dict(sorted(reviewed.items())))
    print(f"{len(added)} palabras nuevas · total {len(words) + len(added)}")


if __name__ == "__main__":
    main()
