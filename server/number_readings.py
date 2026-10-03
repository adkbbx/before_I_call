"""Context-specific Japanese readings for minutes, clock hours and people."""
import re

DIGITS = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう']
KANJI = '零一二三四五六七八九'

def kanji(number):
    tens, units = divmod(number, 10)
    return ((KANJI[tens] if tens > 1 else '') + '十' if tens else '') + (KANJI[units] if units else '') or '零'

def cardinal(number):
    tens, units = divmod(number, 10)
    return ((DIGITS[tens] if tens > 1 else '') + 'じゅう' if tens else '') + DIGITS[units] or 'れい'

READINGS = {}
VALUES = {}
for number in range(60):
    tens, units = divmod(number, 10)
    minute = ((DIGITS[tens] if tens > 1 else '') + 'じゅう' if tens else '') + ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん'][units]
    if not units:
        minute = (DIGITS[tens] if tens > 1 else '') + 'じゅっぷん' if tens else 'れいふん'
    values = {'分': minute}
    if number <= 24:
        hour = cardinal(number)
        if units in (4, 7, 9):
            hour = ((DIGITS[tens] if tens > 1 else '') + 'じゅう' if tens else '') + {4: 'よ', 7: 'しち', 9: 'く'}[units]
        values['時'] = hour + 'じ'
    if 1 <= number <= 10:
        values['人'] = {1: 'ひとり', 2: 'ふたり', 4: 'よにん'}.get(number, cardinal(number) + 'にん')
    for unit, reading in values.items():
        for spelling in (str(number), ''.join(chr(ord(char) + 0xFEE0) for char in str(number)), kanji(number)):
            READINGS[spelling + unit] = reading
            VALUES[spelling + unit] = number

# Longer matches first; don't turn the tail of an unsupported large count into a small count.
PATTERN = re.compile(r'(?<![\d零一二三四五六七八九十百千万])(?:' + '|'.join(sorted(map(re.escape, READINGS), key=len, reverse=True)) + r')')

def words(text):
    return [{'text': match.group(), 'reading': READINGS[match.group()], 'meaning': str(VALUES[match.group()]) + (' minutes' if match.group().endswith('分') else ' o’clock' if match.group().endswith('時') else ' people')} for match in PATTERN.finditer(text)]
