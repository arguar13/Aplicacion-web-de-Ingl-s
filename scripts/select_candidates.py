"""Elige las próximas palabras para ampliar el vocabulario, de la más usada a la menos usada.

Recorre la lista de frecuencias de wordfreq y se queda con lemas útiles para aprender:
  - que no estén ya en src/data/words.json (ni como palabra ni como forma de una que ya esté);
  - que sean un lema de WordNet ("run", no "runs"), no solo un nombre propio ("france", "john");
  - de 3 letras o más, solo letras, sin groserías ni abreviaturas.

El resultado (scripts/data/candidates.json) es la entrada para traducir: las traducciones, los
ejemplos y la categoría se revisan antes de pasar a words.json.

    pip install wordfreq nltk && python -m nltk.downloader wordnet names
    python scripts/select_candidates.py 4022
"""

import json
import sys
from pathlib import Path

from nltk.corpus import names
from nltk.corpus import wordnet as wn
from wordfreq import top_n_list, zipf_frequency

ROOT = Path(__file__).resolve().parent.parent
WORDS = ROOT / "src" / "data" / "words.json"
OUT = ROOT / "scripts" / "data" / "candidates.json"

# Palabras que no se enseñan en una app general (insultos, contenido sexual o drogas).
BLOCKLIST = set(
    """fuck fucking fucked shit shitty bitch bastard dick cock pussy cunt ass asshole damn whore slut
    porn porno sex sexy nude naked horny boob boobs tits penis vagina nigga nigger fag faggot retard
    retarded weed cocaine heroin meth orgasm erotic erection masturbation fetish bullshit rape rapist""".split()
)
FIRST_NAMES = {name.lower() for name in names.words()}


def is_lemma(word: str) -> bool:
    """Es un lema de WordNet y no la forma flexionada de otro ("years" es forma de "year")."""
    lemmas = {wn.morphy(word, pos) for pos in "nvar"} - {None}
    return lemmas == {word}


def is_common_word(word: str) -> bool:
    """Tiene algún sentido en minúscula que no sea un nombre de persona, lugar u organización."""
    return any(
        not synset.instance_hypernyms() and any(lemma.name() == word for lemma in synset.lemmas())
        for synset in wn.synsets(word)
    )


# Terminaciones flexivas: (terminación, lo que la reemplaza para volver a la base).
INFLECTIONS = [
    ("ies", "y"), ("es", ""), ("s", ""), ("iest", "y"), ("ier", "y"), ("est", ""), ("est", "e"),
    ("er", ""), ("er", "e"), ("ed", ""), ("ed", "e"), ("ing", ""), ("ing", "e"),
]


def is_inflection(word: str, known: set[str]) -> bool:
    """"years", "higher", "leaders": WordNet los tiene como lemas, pero se aprende la base."""
    for ending, replacement in INFLECTIONS:
        if word.endswith(ending) and len(word) - len(ending) >= 3:
            base = word[: -len(ending)] + replacement
            if base in known or (wn.synsets(base) and zipf_frequency(base, "en") > zipf_frequency(word, "en")):
                return True
    return False


BRITISH = [("isation", "ization"), ("ise", "ize"), ("our", "or"), ("tre", "ter"), ("ence", "ense"), ("ogue", "og")]


def is_british_variant(word: str) -> bool:
    """"organisation", "centre", "offence": se enseña la grafía americana si también se usa."""
    for british, american in BRITISH:
        if word.endswith(british):
            variant = word[: -len(british)] + american
            if zipf_frequency(variant, "en") >= zipf_frequency(word, "en") - 0.5 and wn.synsets(variant):
                return True
    return False


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 4000
    existing = json.loads(WORDS.read_text(encoding="utf-8"))
    known = {w["en"].lower() for w in existing} | {w["id"] for w in existing}
    # Los lemas de lo que ya está: "children" ya enseña "child", "went" ya enseña "go"…
    known_lemmas = {wn.morphy(word) or word for word in known}

    picked: list[dict] = []
    for word in top_n_list("en", 60000):
        if len(picked) >= count:
            break
        if not word.isalpha() or not word.isascii() or len(word) < 3:
            continue
        if word in known or word in BLOCKLIST:
            continue
        if not is_lemma(word) or not is_common_word(word) or is_british_variant(word):
            continue
        if is_inflection(word, known):
            continue
        # Los nombres de pila que además son palabra ("bill", "rose", "john") se usan sobre todo
        # como nombres: los que valen la pena ya están entre las primeras palabras.
        if word in FIRST_NAMES or word in known_lemmas:
            continue
        picked.append({"id": word, "en": word, "zipf": round(zipf_frequency(word, "en"), 2)})

    OUT.write_text(json.dumps(picked, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(picked)} candidatas; de {picked[0]['en']} (zipf {picked[0]['zipf']}) a {picked[-1]['en']} (zipf {picked[-1]['zipf']})")
    print("Muestra:", ", ".join(p["en"] for p in picked[::200]))


if __name__ == "__main__":
    main()
