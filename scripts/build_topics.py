"""Genera src/data/topics.json: las colecciones temáticas (comida, animales, cuerpo, emociones…).

Cada palabra va al tema de su sentido en WordNet: el campo semántico ("lexname") del synset que
contiene a la vez la palabra inglesa y su traducción española (Open Multilingual Wordnet). Así
"queen" = "reina" es una persona y no la abeja reina, y "bank" = "banco" no es la orilla del río.
Si ningún sentido coincide con la traducción, se usa el más frecuente de su categoría gramatical.

    pip install nltk && python -m nltk.downloader wordnet omw-1.4
    python scripts/build_topics.py
"""

import json
import re
from collections import Counter
from pathlib import Path

from nltk.corpus import wordnet as wn

ROOT = Path(__file__).resolve().parent.parent
WORDS = ROOT / "src" / "data" / "words.json"
OUT = ROOT / "src" / "data" / "topics.json"
DETAILS = ROOT / "src" / "data" / "details.json"

POS = {"noun": wn.NOUN, "verb": wn.VERB}

# Tema → campos semánticos de WordNet que reúne. El orden es el de la pantalla. Quedan fuera los
# campos verbales demasiado genéricos para un tema (posesión: have, get; comunicación: will, say;
# consumo: use) y el de "fenómenos" (result, response, effect).
TOPICS = {
    "comida": ["noun.food"],
    "animales": ["noun.animal"],
    "naturaleza": ["noun.plant", "noun.object", "verb.weather"],
    "cuerpo": ["noun.body", "verb.body"],
    "personas": ["noun.person"],
    "emociones": ["noun.feeling", "verb.emotion"],
    "comunicacion": ["noun.communication"],
    "mente": ["noun.cognition", "verb.cognition"],
    "ropa": [],
    "transporte": [],
    "edificios": [],
    "objetos": ["noun.artifact"],
    "lugares": ["noun.location"],
    "tiempo": ["noun.time"],
    "movimiento": ["verb.motion"],
    "dinero": ["noun.possession"],
    "sociedad": ["noun.group"],
    "materiales": ["noun.substance"],
    "medidas": ["noun.quantity", "noun.shape"],
}
LEX_TO_TOPIC = {lex: topic for topic, lexes in TOPICS.items() for lex in lexes}

# Correcciones tras revisar el resultado: otro tema (o None para dejarla fuera de todos).
TOPIC_OVERRIDES = {
    "queen": "personas", "giant": None, "drone": "objetos", "bot": None, "mankind": "personas",
    "cricket": None, "fetus": None, "gal": "personas", "parking": None, "tee": None, "upside": None,
    "desktop": "objetos", "zodiac": None, "cologne": None, "trend": None, "speed": None,
    "velocity": None, "fertility": None, "bout": None, "restoration": None, "reconstruction": None,
    "royalty": None, "pawn": None, "plantation": None, "option": None, "reboot": None, "socket": None,
    "specimen": None, "sire": None, "hatch": None, "exhaust": None, "flush": None, "relieve": None,
    "alleviate": None, "cleanse": None, "behave": None, "marijuana": None, "agent": None,
    "opening": None, "calculus": None, "medic": "personas", "thrift": None, "cola": "comida",
    "popcorn": "comida", "attachment": None, "brace": None, "recreate": None, "invite": None,
    "resignation": None, "compatibility": None, "expectancy": None, "distract": None,
}


def first_sense(es: str) -> str:
    """"hacer, fabricar (de make)" → "hacer"."""
    parts = [x.strip().lower() for x in re.split(r",| o ", re.sub(r"\([^)]*\)", "", es)) if x.strip()]
    return parts[0] if parts else ""


# Los objetos (noun.artifact) son muchos: se separan por su familia en WordNet.
ARTIFACT_FAMILIES = [
    ("ropa", {"clothing.n.01", "footwear.n.02", "headdress.n.01"}),
    ("transporte", {"conveyance.n.03", "vehicle.n.01", "craft.n.02", "road.n.01", "thoroughfare.n.01"}),
    ("edificios", {"building.n.01", "structure.n.01", "room.n.01", "establishment.n.04"}),
]


def artifact_family(synset) -> str:
    ancestors = {s.name() for s in synset.closure(lambda s: s.hypernyms())} | {synset.name()}
    for topic, families in ARTIFACT_FAMILIES:
        if ancestors & families:
            return topic
    return "objetos"


def sense_of(word: dict):
    """El synset de la palabra en el sentido de su traducción (o None si hay dudas)."""
    pos = POS.get(word["pos"])
    if not pos:
        return None
    synsets = wn.synsets(word["en"].lower(), pos)
    if not synsets:
        return None
    spanish = first_sense(word["es"]).replace(" ", "_")
    aligned = [s for s in synsets if spanish in (name.lower() for name in s.lemma_names("spa"))]
    if not aligned:
        # Sin un sentido que coincida con la traducción, solo si no hay duda: todos sus sentidos
        # son del mismo campo ("vessel" = "buque" no es el vaso sanguíneo del cuerpo).
        return synsets[0] if len({s.lexname() for s in synsets}) == 1 else None
    # Entre los que coinciden con la traducción, el sentido más usado de la palabra inglesa.
    form = word["en"].lower()
    return max(aligned, key=lambda s: sum(l.count() for l in s.lemmas() if l.name().lower() == form))


def topic_of(word: dict) -> str | None:
    if word["id"] in TOPIC_OVERRIDES:
        return TOPIC_OVERRIDES[word["id"]]
    synset = sense_of(word)
    if synset is None:
        return None
    topic = LEX_TO_TOPIC.get(synset.lexname())
    return artifact_family(synset) if topic == "objetos" else topic


def main() -> None:
    words = json.loads(WORDS.read_text(encoding="utf-8"))
    details = json.loads(DETAILS.read_text(encoding="utf-8"))
    topics: dict[str, list[str]] = {topic: [] for topic in TOPICS}
    for word in words:
        # Nombres propios y títulos ("God", "May", "Mr.") no son vocabulario temático, ni las formas
        # de otra palabra ("women", "went", "feet"): en el tema ya está la palabra base.
        if (word["en"][:1].isupper() and word["en"] != "I") or "of" in details.get(word["id"], {}):
            continue
        topic = topic_of(word)
        if topic:
            topics[topic].append(word["id"])

    OUT.write_text(json.dumps(topics, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    counts = Counter({topic: len(ids) for topic, ids in topics.items()})
    print(", ".join(f"{topic}: {n}" for topic, n in counts.items()))
    by_id = {w["id"]: w for w in words}
    for topic, ids in topics.items():
        print(f"  {topic}: " + ", ".join(f"{i}={by_id[i]['es'].split(',')[0]}" for i in ids[:10]))


if __name__ == "__main__":
    main()
