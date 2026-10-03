"""Generate bounded Japanese date/counter aliases; see docs/pronunciation.md."""
from server.number_readings import cardinal, kanji, DIGITS, READINGS as TIME_READINGS

FULLWIDTH = str.maketrans('0123456789', '０１２３４５６７８９')


def spellings(number):
    return (str(number), str(number).translate(FULLWIDTH), kanji(number))


MONTHS = ('', 'いちがつ', 'にがつ', 'さんがつ', 'しがつ', 'ごがつ', 'ろくがつ', 'しちがつ', 'はちがつ', 'くがつ', 'じゅうがつ', 'じゅういちがつ', 'じゅうにがつ')
DAYS = ('', 'ついたち', 'ふつか', 'みっか', 'よっか', 'いつか', 'むいか', 'なのか', 'ようか', 'ここのか', 'とおか', 'じゅういちにち', 'じゅうににち', 'じゅうさんにち', 'じゅうよっか', 'じゅうごにち', 'じゅうろくにち', 'じゅうしちにち', 'じゅうはちにち', 'じゅうくにち', 'はつか', 'にじゅういちにち', 'にじゅうににち', 'にじゅうさんにち', 'にじゅうよっか', 'にじゅうごにち', 'にじゅうろくにち', 'にじゅうしちにち', 'にじゅうはちにち', 'にじゅうくにち', 'さんじゅうにち', 'さんじゅういちにち')


def contracted(number, endings):
    tens, units = divmod(number, 10)
    prefix = cardinal(tens * 10) if tens else ''
    if units == 0:
        return (DIGITS[tens] if tens > 1 else '') + endings[0]
    return prefix + endings[units]


def build_readings():
    readings = {}

    def add(number, suffix, reading, kanji_ok=True):
        for spelling in spellings(number)[:3 if kanji_ok else 2]:
            readings[spelling + suffix] = reading

    for month in range(1, 13):
        # 一月 / 二月 can also mean one/two months. Keep bare kanji ambiguous.
        add(month, '月', MONTHS[month], kanji_ok=month > 2)
        for month_text in spellings(month):
            for first_text in spellings(1):
                readings[month_text + '月' + first_text + '日'] = MONTHS[month] + ' ついたち'
    for day in range(1, 32):
        if day > 1:
            add(day, '日', DAYS[day])
        add(day, '日間', ('いちにち' if day == 1 else DAYS[day]) + 'かん')
    for spelling in spellings(1):
        for suffix, reading in {'日中': 'いちにちじゅう', '日後': 'いちにちご', '日前': 'いちにちまえ', '日おき': 'いちにちおき', '日あたり': 'いちにちあたり', '日につき': 'いちにちにつき'}.items():
            readings[spelling + suffix] = reading
        readings['毎月' + spelling + '日'] = 'まいつきついたち'

    for number in range(0, 61):
        if number < 60:
            add(number, '秒', cardinal(number) + 'びょう')
        # Kanji 分 may denote a fraction or degree, e.g. 十分 / 三分の一.
        minute = TIME_READINGS.get(str(number) + '分', 'ろくじゅっぷん')
        add(number, '分', minute, kanji_ok=False)
        add(number, '分間', minute + 'かん')
    for hour in range(25):
        clock = TIME_READINGS[str(hour) + '時']
        add(hour, '時', clock)
        add(hour, '時半', clock + 'はん')
        add(hour, '時間', clock + 'かん')
        # Full clock phrases disambiguate kanji minutes without overriding 十分.
        for minute in range(60):
            readings[kanji(hour) + '時' + kanji(minute) + '分'] = clock + ' ' + TIME_READINGS[str(minute) + '分']

    for number in range(1, 100):
        count = cardinal(number)
        add(number, '分の', count + 'ぶんの')
        people = {1: 'ひとり', 2: 'ふたり'}.get(number, count + 'にん')
        if number % 10 == 4:
            people = (cardinal(number - 4) if number > 4 else '') + 'よにん'
        add(number, '人', people)
        for suffix in ('枚', '台', '番'):
            add(number, suffix, count + {'枚': 'まい', '台': 'だい', '番': 'ばん'}[suffix])
        for suffix in ('個', '回', '階', '冊', '本'):
            endings = {
                '個': ('じゅっこ', 'いっこ', 'にこ', 'さんこ', 'よんこ', 'ごこ', 'ろっこ', 'ななこ', 'はっこ', 'きゅうこ'),
                '回': ('じゅっかい', 'いっかい', 'にかい', 'さんかい', 'よんかい', 'ごかい', 'ろっかい', 'ななかい', 'はっかい', 'きゅうかい'),
                '階': ('じゅっかい', 'いっかい', 'にかい', 'さんがい', 'よんかい', 'ごかい', 'ろっかい', 'ななかい', 'はっかい', 'きゅうかい'),
                '冊': ('じゅっさつ', 'いっさつ', 'にさつ', 'さんさつ', 'よんさつ', 'ごさつ', 'ろくさつ', 'ななさつ', 'はっさつ', 'きゅうさつ'),
                '本': ('じゅっぽん', 'いっぽん', 'にほん', 'さんぼん', 'よんほん', 'ごほん', 'ろっぽん', 'ななほん', 'はっぽん', 'きゅうほん'),
            }[suffix]
            add(number, suffix, contracted(number, endings))
    for number in range(1, 25):
        weeks = contracted(number, ('じゅっしゅう', 'いっしゅう', 'にしゅう', 'さんしゅう', 'よんしゅう', 'ごしゅう', 'ろくしゅう', 'ななしゅう', 'はっしゅう', 'きゅうしゅう'))
        add(number, '週間', weeks + 'かん')
        months = contracted(number, ('じゅっかげつ', 'いっかげつ', 'にかげつ', 'さんかげつ', 'よんかげつ', 'ごかげつ', 'ろっかげつ', 'ななかげつ', 'はっかげつ', 'きゅうかげつ'))
        for suffix in ('か月', 'ヶ月', 'カ月', '箇月', 'ケ月'):
            add(number, suffix, months)
    for number in range(1, 10):
        add(number, 'つ', ('', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ')[number])
    # 一人称 / 二人称 use different readings from a count of people.
    readings.update({'一人称': 'いちにんしょう', '二人称': 'ににんしょう', '三人称': 'さんにんしょう', '一人前': 'いちにんまえ'})
    return readings


READINGS = build_readings()
