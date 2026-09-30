"""Valida un lote traducido: python scripts/data/translations/validate.py NN"""
import json, re, sys
from pathlib import Path

POS = {"noun", "verb", "adj", "adv", "pron", "det", "prep", "conj", "num", "interj"}
n = sys.argv[1].zfill(2)
here = Path(__file__).parent
words = json.loads((here / f"input-{n}.json").read_text(encoding="utf-8"))
out = json.loads((here / f"batch-{n}.json").read_text(encoding="utf-8"))
errors = []
ids = [e.get("id") for e in out]
if sorted(ids) != sorted(words):
    errors.append(f"ids distintos: faltan {sorted(set(words) - set(ids))[:10]} sobran {sorted(set(ids) - set(words))[:10]}")
for e in out:
    if "skip" in e:
        if not isinstance(e["skip"], str) or not e["skip"].strip():
            errors.append(f"{e['id']}: skip sin motivo")
        continue
    for key in ("es", "pos", "example_en", "example_es"):
        if not isinstance(e.get(key), str) or not e[key].strip():
            errors.append(f"{e['id']}: falta {key}")
    if e.get("pos") not in POS:
        errors.append(f"{e['id']}: pos inválida {e.get('pos')}")
    if not re.search(rf"(?<![A-Za-z]){re.escape(e['id'])}(?![A-Za-z])", e.get("example_en", ""), re.I):
        errors.append(f"{e['id']}: el ejemplo no contiene la palabra exacta")
    if e.get("es", "") != e.get("es", "").strip() or e.get("es", "")[:1].isupper():
        errors.append(f"{e['id']}: la traducción va en minúscula y sin espacios sobrantes")
print(f"lote {n}: {len(out)} entradas, {sum('skip' in e for e in out)} descartadas, {len(errors)} errores")
print("\n".join(errors[:40]))
sys.exit(1 if errors else 0)
