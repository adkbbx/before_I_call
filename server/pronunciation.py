"""Shared, context-specific Japanese speech corrections."""
import re

READINGS = {
    '夜７時以降': 'よる しちじ いこう',
    '夜7時以降': 'よる しちじ いこう',
    '夜七時以降': 'よる しちじ いこう',
    '洗濯機': 'せんたくき',
    '明日': 'あした',
    '田中': 'たなか',
    '洗って': 'あらって',
    '伺い': 'うかがい',
    '伺え': 'うかがえ',
    '伺う': 'うかがう',
    '場所': 'ばしょ',
    '水漏れ': 'みずもれ',
    '排水': 'はいすい',
    '水曜日': 'すいようび',
}
# Apply longer phrases first, and replace only the original input once.
PATTERN = re.compile('|'.join(re.escape(word) for word in sorted(READINGS, key=len, reverse=True)))


def speech_text(text: str, language: str = 'ja') -> str:
    return PATTERN.sub(lambda match: READINGS[match.group()], text) if language == 'ja' else text


def dictionary_rules():
    return [{'type': 'alias', 'string_to_replace': word, 'alias': reading} for word, reading in READINGS.items()]
