"""Tests de la conversión a IPA y de las formas: python -m pytest scripts (o python scripts/test_enrich_words.py)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from enrich_words import forms_of, ipa_of  # noqa: E402

CASES = {
    "water": "/ˈwɔtɚ/",
    "important": "/ɪmˈpɔrtənt/",
    "about": "/əˈbaʊt/",
    "understand": "/ˌʌndɚˈstænd/",
    "develop": "/dɪˈvɛləp/",
    "photography": "/fəˈtɑɡrəfi/",
    "extraordinary": "/ɪkˈstrɔrdəˌnɛri/",
    "the": "/ðə/",
    "strength": "/strɛŋkθ/",
    "comfortable": "/ˈkʌmfɚtəbəl/",
    "children": "/ˈtʃɪldrən/",
    "in addition": "/ɪn əˈdɪʃən/",
}


def test_ipa():
    for word, expected in CASES.items():
        assert ipa_of(word) == expected, (word, ipa_of(word), expected)


def test_forms():
    assert forms_of({"en": "go", "pos": "verb"}) == ({"past": "went", "participle": "gone"}, None)
    assert forms_of({"en": "went", "pos": "verb"}) == (None, {"lemma": "go", "form": "past"})
    assert forms_of({"en": "made", "pos": "verb"}) == (None, {"lemma": "make", "form": "past-participle"})
    assert forms_of({"en": "child", "pos": "noun"}) == ({"plural": "children"}, None)
    assert forms_of({"en": "work", "pos": "verb"}) == (None, None)
    assert forms_of({"en": "learn", "pos": "verb"}) == (None, None)


if __name__ == "__main__":
    test_ipa()
    test_forms()
    print("ok")
