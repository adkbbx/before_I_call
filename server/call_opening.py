"""Contextual openings without another model request."""
import re

OPENINGS = {
    'dentist': ('歯科医院の受付です。ご用件をお伺いします。', 'Hello, dental reception. How can I help?'),
    'clinic': ('クリニックの受付です。ご用件をお伺いします。', 'Hello, clinic reception. How can I help?'),
    'repair': ('管理会社です。ご用件をお伺いします。', 'Hello, building management. How can I help?'),
    'delivery': ('配送のお問い合わせ窓口です。ご用件をお伺いします。', 'Hello, delivery enquiries. How can I help?'),
    'food': ('お電話ありがとうございます。ご用件をお伺いします。', 'Hello, restaurant reservations. How can I help?'),
    'city': ('市役所の窓口です。ご用件をお伺いします。', 'Hello, city office. How can I help?'),
    'lost': ('お忘れ物のお問い合わせ窓口です。ご用件をお伺いします。', 'Hello, lost property. How can I help?'),
    'bill': ('料金のお問い合わせ窓口です。ご用件をお伺いします。', 'Hello, billing enquiries. How can I help?'),
    'custom': ('お電話ありがとうございます。ご用件をお伺いします。', 'Hello, thanks for calling. How can I help?'),
}
PATTERNS = [
    ('dentist', r'\bdent(?:ist|al)\b|歯医者|歯科'),
    ('clinic', r'\bclinic\b|\bhospital\b|クリニック|病院'),
    ('repair', r'\blandlord\b|\bbuilding manag(?:er|ement)\b|管理会社|大家'),
    ('delivery', r'\b(?:delivery|courier|parcel)\b|配送|宅配|再配達'),
    ('food', r'\brestaurant\b|レストラン|飲食店'),
    ('city', r'\bcity (?:hall|office)\b|\bward office\b|市役所|区役所'),
    ('lost', r'\blost (?:property|and found)\b|忘れ物|遺失物'),
    ('bill', r'\bbilling\b|\butility company\b|料金|請求'),
]

def call_opening(scenario: str, scenario_id: str, language: str) -> str:
    kind = scenario_id
    if kind == 'custom':
        kind = next((name for name, pattern in PATTERNS if re.search(pattern, scenario, re.I)), 'custom')
    return OPENINGS.get(kind, OPENINGS['custom'])[1 if language == 'en' else 0]
