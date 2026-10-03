"""Checks a practice partner reply against the role-play rules in practice_prompt(). Text is inspected in memory only."""
import re

GOODBYE = re.compile(
    r'以上です|さようなら|さよなら|失礼します|失礼いたします|終わりにします|^\W*いいえ[、,]?\s*(大丈夫です|結構です)'
    r"|\b(good ?bye|bye|that'?s all|that is all|nothing else|i'?m done|end the call|hang up)\b",
    re.I,
)
# Confirming or arranging an outcome the rehearsal cannot deliver.
BOOKING = re.compile(
    r'予約(を|が|は)?(お取りしました|承りました|確定|完了|入れました|取れました)|ご予約をお待ちしております|手配(いたしました|しました|が完了)'
    r"|\byour (booking|appointment|reservation|repair|redelivery|delivery) (is|has been) (confirmed|booked|scheduled|arranged)\b"
    r"|\bi(?:'ve| have) (booked|scheduled|confirmed|arranged)\b|\byou(?:'re| are) (?:all )?booked\b",
    re.I,
)
KANA = re.compile(r'[぀-ヿ]')
RULES = {
    'missed_hang_up': 'The learner said goodbye but the partner did not call end_call.',
    'claimed_booking': 'The partner confirmed a booking or outcome, which the rehearsal must never do.',
    'digits_in_japanese_speech': 'A Japanese reply used digits; the voice reads them less reliably than kana.',
    'english_in_japanese_speech': 'A Japanese reply contained Latin letters, which the Japanese voice mispronounces.',
}


def text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return ''.join(part.get('text', '') for part in content if isinstance(part, dict) and isinstance(part.get('text'), str))
    return ''


def last_learner_message(messages) -> str | None:
    """The learner's words when this request answers them directly; None after tool results or system updates."""
    if isinstance(messages, list) and messages and isinstance(messages[-1], dict) and messages[-1].get('role') == 'user':
        return text_of(messages[-1].get('content'))
    return None


def check(learner: str | None, reply: str, tools, completed: bool) -> tuple[list[str], bool]:
    """Returns (rules broken, whether the learner said goodbye)."""
    goodbye = bool(learner and GOODBYE.search(learner))
    broken = []
    if goodbye and completed and 'end_call' not in tools:
        broken.append('missed_hang_up')
    if BOOKING.search(reply):
        broken.append('claimed_booking')
    if KANA.search(reply):
        if re.search(r'[0-9０-９]', reply):
            broken.append('digits_in_japanese_speech')
        if re.search(r'[A-Za-z]{2,}', reply):
            broken.append('english_in_japanese_speech')
    return broken, goodbye
