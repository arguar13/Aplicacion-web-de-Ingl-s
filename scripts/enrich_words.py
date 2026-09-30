"""Genera src/data/details.json: pronunciación (IPA), formas irregulares y frase de ejemplo.

Fuentes:
  - IPA: CMU Pronouncing Dictionary (inglés americano, licencia BSD), convertido de ARPAbet a IPA
    con el acento marcado al inicio de la sílaba tónica.
  - Formas: tabla de verbos irregulares (scripts/data/irregular_verbs.py) y excepciones de
    sustantivos de WordNet (niños → children). Las palabras que ya son una forma flexionada
    ("went", "children") guardan de qué palabra son forma.
  - Ejemplos: scripts/data/examples/*.json (una frase por palabra, revisada).

    pip install nltk && python -m nltk.downloader cmudict wordnet
    python scripts/enrich_words.py
"""

import json
import re
import sys
from pathlib import Path

from nltk.corpus import cmudict
from nltk.corpus import wordnet as wn

sys.path.insert(0, str(Path(__file__).parent / "data"))
from irregular_verbs import IRREGULAR_VERBS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
WORDS = ROOT / "src" / "data" / "words.json"
DETAILS = ROOT / "src" / "data" / "details.json"
EXAMPLES = ROOT / "scripts" / "data" / "examples"

# --- IPA ----------------------------------------------------------------------------------------

VOWELS = {
    "AA": "ɑ", "AE": "æ", "AO": "ɔ", "AW": "aʊ", "AY": "aɪ", "EH": "ɛ", "EY": "eɪ",
    "IH": "ɪ", "IY": "i", "OW": "oʊ", "OY": "ɔɪ", "UH": "ʊ", "UW": "u",
}
CONSONANTS = {
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð", "F": "f", "G": "ɡ", "HH": "h", "JH": "dʒ", "K": "k",
    "L": "l", "M": "m", "N": "n", "NG": "ŋ", "P": "p", "R": "r", "S": "s", "SH": "ʃ", "T": "t",
    "TH": "θ", "V": "v", "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ",
}
# Consonantes y grupos con los que puede empezar una sílaba en inglés.
SINGLE_ONSETS = {(c,) for c in CONSONANTS if c != "NG"}
CLUSTER_ONSETS = {
    tuple(cluster.split())
    for cluster in (
        "P L", "P R", "P Y", "B L", "B R", "B Y", "T R", "T W", "D R", "D W", "K L", "K R", "K W",
        "K Y", "G L", "G R", "G W", "F L", "F R", "F Y", "TH R", "TH W", "SH R", "S P", "S T", "S K",
        "S M", "S N", "S L", "S W", "S F", "M Y", "N Y", "V Y", "HH Y", "S P L", "S P R", "S T R",
        "S K R", "S K W", "S K Y", "S P Y",
    )
}
ONSETS = SINGLE_ONSETS | CLUSTER_ONSETS


def vowel(phone: str) -> tuple[str, int] | None:
    base, stress = phone.rstrip("012"), phone[-1]
    # Con acento (primario o secundario) la vocal es plena: ʌ, ɝ; átona se reduce: ə, ɚ.
    if base == "AH":
        return ("ə" if stress == "0" else "ʌ"), int(stress)
    if base == "ER":
        return ("ɚ" if stress == "0" else "ɝ"), int(stress)
    if base in VOWELS:
        return VOWELS[base], int(stress) if stress.isdigit() else 0
    return None


def to_ipa(phones: list[str]) -> str:
    """ARPAbet → IPA, con ˈ y ˌ delante de la sílaba (principio de ataque máximo)."""
    vowel_positions = [i for i, p in enumerate(phones) if vowel(p)]
    marks = {}
    if len(vowel_positions) > 1:
        previous = -1
        for index in vowel_positions:
            stress = vowel(phones[index])[1]
            cluster = phones[previous + 1 : index]
            # Al principio de la palabra, todas las consonantes son de la primera sílaba.
            onset = len(cluster) if previous == -1 else 0
            for size in range(len(cluster), 0, -1):
                if onset:
                    break
                if tuple(cluster[-size:]) in ONSETS:
                    onset = size
            if stress in (1, 2):
                marks[index - onset] = "ˈ" if stress == 1 else "ˌ"
            previous = index
    out = []
    for i, phone in enumerate(phones):
        out.append(marks.get(i, ""))
        v = vowel(phone)
        out.append(v[0] if v else CONSONANTS[phone])
    return "/" + "".join(out) + "/"


PRONUNCIATIONS = cmudict.dict()
# Palabras que el diccionario no trae como tales.
# Palabras que no están en CMUdict (sobre todo recientes), transcritas a mano con el mismo estilo.
IPA_OVERRIDES = {
    "ceo": "/ˌsiˌiˈoʊ/", "wastage": "/ˈweɪstɪdʒ/",
    "blog": "/blɑɡ/", "anime": "/ˈænəˌmeɪ/", "podcast": "/ˈpɑdˌkæst/", "iconic": "/aɪˈkɑnɪk/",
    "upload": "/ˈʌpˌloʊd/", "meme": "/mim/", "blogger": "/ˈblɑɡɚ/", "bot": "/bɑt/",
    "preseason": "/ˈpriˌsizən/", "midfield": "/ˈmɪdˌfild/", "playlist": "/ˈpleɪˌlɪst/",
    "reboot": "/ˈriˌbut/", "fandom": "/ˈfændəm/", "webcam": "/ˈwɛbˌkæm/", "spectral": "/ˈspɛktrəl/",
    "homepage": "/ˈhoʊmˌpeɪdʒ/", "relegation": "/ˌrɛləˈɡeɪʃən/", "mindfulness": "/ˈmaɪndfəlnəs/",
    "batsman": "/ˈbætsmən/", "playable": "/ˈpleɪəbəl/", "iteration": "/ˌɪtəˈreɪʃən/",
}


def ipa_of(word: str) -> str | None:
    key = word.lower()
    if key in IPA_OVERRIDES:
        return IPA_OVERRIDES[key]
    if key in PRONUNCIATIONS:
        return to_ipa(PRONUNCIATIONS[key][0])
    # Compuestas ("well-known", "in addition"): cada parte con su propio acento.
    parts = re.split(r"[-\s]", key)
    if len(parts) > 1 and all(p in PRONUNCIATIONS for p in parts):
        return "/" + " ".join(to_ipa(PRONUNCIATIONS[p][0]).strip("/") for p in parts) + "/"
    return None


# --- Formas -------------------------------------------------------------------------------------

VERBS = {base: (past, participle) for base, past, participle in IRREGULAR_VERBS}
REGULAR = lambda base, form: form in (base + "ed", base + "d", base[:-1] + "ied")  # noqa: E731
PAST_OF = {}
PARTICIPLE_OF = {}
for base, past, participle in IRREGULAR_VERBS:
    for p in past.split("/"):
        PAST_OF.setdefault(p, base)
    PARTICIPLE_OF.setdefault(participle, base)
BE_PRESENT = {"am", "is", "are"}
NOUN_PLURALS = {}
for plural, lemmas in wn._exception_map["n"].items():
    for lemma in lemmas:
        if plural != lemma and "_" not in plural:
            NOUN_PLURALS.setdefault(lemma, plural)


def forms_of(word: dict) -> tuple[dict | None, dict | None]:
    """(formas propias, de qué palabra es forma)."""
    en, pos = word["en"].lower(), word["pos"]
    if pos == "verb":
        if en in BE_PRESENT:
            return None, {"lemma": "be", "form": "present"}
        is_past, is_participle = en in PAST_OF, en in PARTICIPLE_OF
        if (is_past or is_participle) and en not in VERBS:
            lemma = PAST_OF.get(en) or PARTICIPLE_OF[en]
            form = "past-participle" if is_past and is_participle else "past" if is_past else "participle"
            return None, {"lemma": lemma, "form": form}
        if en in VERBS:
            past, participle = VERBS[en]
            if not (REGULAR(en, past) and REGULAR(en, participle)):
                return {"past": past, "participle": participle}, None
            return None, None
        lemma = wn.morphy(en, "v")
        if lemma and lemma != en:
            if en.endswith("ing"):
                return None, {"lemma": lemma, "form": "gerund"}
            if en.endswith("ed"):
                return None, {"lemma": lemma, "form": "past-participle"}
            if en.endswith("s"):
                return None, {"lemma": lemma, "form": "third-person"}
    if pos == "noun":
        lemma = wn.morphy(en, "n")
        if lemma and lemma != en and en not in NOUN_PLURALS:
            return None, {"lemma": lemma, "form": "plural"}
        if en in NOUN_PLURALS:
            return {"plural": NOUN_PLURALS[en]}, None
    return None, None


# --- Ejemplos -----------------------------------------------------------------------------------


def load_examples() -> dict:
    examples = {}
    for path in sorted(EXAMPLES.glob("*.json")):
        for example in json.loads(path.read_text(encoding="utf-8")):
            examples[example["id"]] = {"en": example["en"].strip(), "es": example["es"].strip()}
    return examples


def main() -> None:
    words = json.loads(WORDS.read_text(encoding="utf-8"))
    examples = load_examples()
    details, missing_ipa = {}, []
    for word in words:
        entry = {}
        ipa = ipa_of(word["en"])
        if ipa:
            entry["ipa"] = ipa
        else:
            missing_ipa.append(word["en"])
        forms, of = forms_of(word)
        if forms:
            entry["forms"] = forms
        if of:
            entry["of"] = of
        if word["id"] in examples:
            entry["example"] = examples[word["id"]]
        details[word["id"]] = entry

    lines = ",\n".join(f"{json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}" for k, v in details.items())
    # newline="\n": en Windows, write_text convertiría los saltos de línea en CRLF.
    DETAILS.write_text("{\n" + lines + "\n}\n", encoding="utf-8", newline="\n")
    print(f"{len(details)} palabras · IPA: {len(details) - len(missing_ipa)} · ejemplos: {len(examples)}")
    print(f"con formas: {sum('forms' in d for d in details.values())} · formas de otra: {sum('of' in d for d in details.values())}")
    if missing_ipa:
        print("sin IPA:", ", ".join(missing_ipa))


if __name__ == "__main__":
    main()
