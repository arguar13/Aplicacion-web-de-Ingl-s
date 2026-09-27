"""Asigna la categoría gramatical ("pos") de cada palabra de src/data/words.json.

La categoría describe la traducción que ve el usuario: "love" traducida como "amor" es un
sustantivo aunque en inglés suela ser verbo. Sirve para que los distractores de cada ronda sean
de la misma categoría que la respuesta (ver src/lib/quiz.ts).

Fuentes, en orden de prioridad:
  1. POS_OVERRIDES: correcciones manuales tras revisar el resultado.
  2. Palabras funcionales (listas cerradas): artículos, pronombres, preposiciones…
  3. Morfología de la traducción: infinitivos (-ar, -er, -ir, -se) → verbo; -mente → adverbio.
  4. WordNet (nltk), incluidas formas flexionadas ("went" → go), eligiendo la categoría más usada
     que sea compatible con la traducción.

    pip install nltk && python -m nltk.downloader wordnet
    python scripts/tag_pos.py            # escribe "pos" en words.json
    python scripts/tag_pos.py --report   # además lista las decisiones dudosas para revisarlas
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

from nltk.corpus import wordnet as wn

WORDS = Path(__file__).resolve().parent.parent / "src" / "data" / "words.json"

# Categorías de src/lib/types.ts (PartOfSpeech).
POS = ("noun", "verb", "adj", "adv", "pron", "det", "prep", "conj", "num", "interj")

CLOSED = {
    "det": """the a an this that these those my your his her its our their some any no every each
        either neither much many more most few fewer less least several all both such what which
        whose another other enough""",
    "pron": """i you he she it we they me him us them mine yours hers ours theirs myself yourself
        himself herself itself ourselves yourselves themselves who whom whoever whatever whichever
        someone somebody something anyone anybody anything everyone everybody everything nobody
        nothing none one oneself""",
    "prep": """about above across after against along amid among around as at before behind below
        beneath beside besides between beyond by despite down during except for from in inside into
        like near of off on onto out outside over past per since through throughout till to toward
        towards under underneath unlike until up upon via with within without""",
    "conj": """and but or nor so yet because although though unless whereas whether while if once
        than that whenever wherever""",
    "num": """zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen
        fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty
        ninety hundred thousand million billion trillion first second third fourth fifth sixth
        seventh eighth ninth tenth dozen""",
    "interj": """hello hi hey bye goodbye oh wow yeah yes no okay ok ouch oops please thanks
        hmm huh ah aha alas cheers damn gosh hooray""",
    "verb": """am is are was were be been being have has had having do does did done doing will
        would shall should can could may might must ought""",
}
CLOSED_WORDS = {}
for pos, words in CLOSED.items():
    for w in words.split():
        CLOSED_WORDS.setdefault(w, pos)

# Correcciones tras revisar el informe (--report). Clave: id de la palabra.
POS_OVERRIDES: dict[str, str] = {
    # Adverbios interrogativos y relativos (WordNet no los recoge).
    "when": "adv", "how": "adv", "where": "adv", "why": "adv", "else": "adv", "whereby": "adv",
    "in-addition": "adv", "etc": "adv",
    "whilst": "conj", "whereupon": "conj", "versus": "prep", "according": "prep",
    "cannot": "verb",
    # Pasados irregulares que coinciden con otro lema ("found" = fundar, "saw" = sierra…).
    "found": "verb", "saw": "verb", "felt": "verb", "fell": "verb", "bit": "noun",
    "fun": "adj", "homeless": "adj", "standing": "adj", "shopping": "noun",
    "sorry": "interj", "alright": "interj",
    # Palabras funcionales cuya traducción es otra cosa ("may" = mayo, no el modal).
    "may": "noun", "yet": "adv", "like": "verb", "off": "adj", "past": "noun",
    # Revisadas al escribir los ejemplos: la traducción las usa con esta categoría.
    "asian": "adj", "scottish": "adj", "mixed": "adj", "engineering": "noun", "cast": "noun",
    "plus": "prep",
}

WN_POS = {"n": "noun", "v": "verb", "a": "adj", "s": "adj", "r": "adv"}
# Pretérito, imperfecto, gerundio y participio: "vino", "pagó", "comía", "trabajando", "hecho".
CONJUGATED = re.compile(r"(ó|aba|ía|ando|iendo|yendo)(\s|$)|^(fue|era|dio|vio|hizo|dijo|puso|tuvo|vino|pudo|supo|quiso|trajo)(\s|$)")
INFINITIVE = re.compile(r"^(\w+(ar|er|ir|ír)(se|la|lo|le|las|los|les)?)(\s|$)")


def senses(es: str) -> list[str]:
    """"hacer, fabricar (de make)" → ["hacer", "fabricar"]."""
    return [x.strip().lower() for x in re.split(r",| o ", re.sub(r"\([^)]*\)", "", es)) if x.strip()]


def english_counts(word: str) -> Counter:
    """Uso de cada categoría en inglés, incluidas las formas flexionadas ("went" → go)."""
    counts = Counter()
    for form in {word, *(wn.morphy(word, p) or word for p in "nvar")}:
        for synset in wn.synsets(form):
            for lemma in synset.lemmas():
                if lemma.name().lower() == form:
                    # +1 para que los sentidos sin frecuencia en el corpus también cuenten.
                    counts[WN_POS[synset.pos()]] += lemma.count() + 1
    return counts


def aligned_counts(word: str, sense: str) -> Counter:
    """Categorías de los sentidos de WordNet que contienen a la vez la palabra y su traducción."""
    counts = Counter()
    spanish = sense.replace(" ", "_")
    for form in {word, *(wn.morphy(word, p) or word for p in "nvar")}:
        for synset in wn.synsets(form):
            if spanish in (name.lower() for name in synset.lemma_names("spa")):
                counts[WN_POS[synset.pos()]] += sum(l.count() + 1 for l in synset.lemmas() if l.name().lower() == form)
    return counts


def spanish_categories(sense: str) -> set[str]:
    return {WN_POS[s.pos()] for s in wn.synsets(sense.replace(" ", "_"), lang="spa")}


def tag(word: dict) -> tuple[str, str]:
    """Devuelve (categoría, motivo). Manda la primera acepción de la traducción: es la que ve el usuario."""
    wid, en, es = word["id"], word["en"].lower(), word["es"]
    if wid in POS_OVERRIDES:
        return POS_OVERRIDES[wid], "manual"

    options = senses(es)
    english = english_counts(en)
    first = options[0] if options else ""

    # 0. Forma verbal flexionada con traducción conjugada: "came" = "vino" (no el vino que se bebe).
    inflected_verb = (wn.morphy(en, "v") or en) != en
    if inflected_verb and CONJUGATED.search(first):
        return "verb", "forma conjugada"

    # 1. Palabras funcionales ("the", "of", "and"…): WordNet no las recoge o las clasifica a su
    # manera (los números como adjetivos). Las que traducen otra cosa van en POS_OVERRIDES.
    if en in CLOSED_WORDS:
        return CLOSED_WORDS[en], "lista cerrada"

    # 2. El sentido exacto de la primera acepción: un synset con la palabra inglesa y su traducción.
    aligned = aligned_counts(en, first)
    if aligned:
        return aligned.most_common(1)[0][0], "alineado"

    # 3. Morfología de la primera acepción, confirmada con el inglés.
    if INFINITIVE.match(first) and english["verb"]:
        return "verb", "infinitivo"
    if len(first) > 7 and first.endswith("mente") and english["adv"]:
        return "adv", "-mente"

    # 4. Las demás acepciones, en orden.
    for sense in options[1:]:
        aligned = aligned_counts(en, sense)
        if aligned:
            return aligned.most_common(1)[0][0], "alineado (otra acepción)"

    # 5. Categorías posibles de la primera acepción en español que también existan en inglés.
    spanish = spanish_categories(first)
    shared = [pos for pos, _ in english.most_common() if pos in spanish]
    if shared:
        return shared[0], "español ∩ inglés"

    if inflected_verb and english["verb"]:
        return "verb", "forma verbal (revisar)"

    # 6. La categoría más usada en inglés (un verbo no encaja con una traducción que no lo es).
    ranked = [pos for pos, _ in english.most_common() if pos != "verb"]
    if ranked:
        return ranked[0], "inglés (revisar)"
    return "noun", "sin datos (revisar)"


def main() -> None:
    words = json.loads(WORDS.read_text(encoding="utf-8"))
    report = "--report" in sys.argv
    doubtful = []
    for word in words:
        pos, why = tag(word)
        assert pos in POS, (word, pos)
        word["pos"] = pos
        if report and "revisar" in why:
            doubtful.append(f"{word['id']:<18} {word['es']:<32} → {pos:<6} ({why})")

    ordered = [{"id": w["id"], "en": w["en"], "es": w["es"], "pos": w["pos"]} for w in words]
    lines = ",\n".join(json.dumps(w, ensure_ascii=False) for w in ordered)
    # newline="\n": en Windows, write_text convertiría los saltos de línea en CRLF.
    WORDS.write_text(f"[\n{lines}\n]\n", encoding="utf-8", newline="\n")

    print(Counter(w["pos"] for w in words).most_common())
    print(Counter(tag(w)[1].split(" (")[0] for w in words).most_common())
    if report:
        print(f"\n{len(doubtful)} decisiones para revisar:")
        print("\n".join(doubtful))


if __name__ == "__main__":
    main()
