"""The downloadable call card: an A4 PDF with furigana, romaji, meanings and useful words."""
import re
import unicodedata
from datetime import date
from functools import cache, lru_cache
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import CondPageBreak, Flowable, Paragraph, SimpleDocTemplate, Spacer

FONTS = Path(__file__).with_name('fonts')
INK, MUTED, ACCENT, TINT, LINE, SURFACE = (HexColor(value) for value in ('#252826', '#626863', '#315b49', '#f0f3ef', '#dfe3dd', '#ffffff'))
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X, MARGIN_TOP, MARGIN_BOTTOM = 52, 46, 66
FRAME_WIDTH, FRAME_HEIGHT = PAGE_WIDTH - 2 * MARGIN_X - 12, PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - 12  # Frames pad 6pt.
JAPANESE = re.compile(r'[぀-ヿ一-鿿]')
# Brand faces, each paired with the other script's face for characters it lacks (macrons, kanji).
FACES = {'Sans': 'SchibstedGrotesk-Regular', 'Sans-Medium': 'SchibstedGrotesk-Medium', 'Sans-SemiBold': 'SchibstedGrotesk-SemiBold', 'JP': 'ZenKakuGothicNew-Regular', 'JP-Medium': 'ZenKakuGothicNew-Medium'}
FALLBACK = {'Sans': 'JP', 'Sans-Medium': 'JP-Medium', 'Sans-SemiBold': 'JP-Medium', 'JP': 'Sans', 'JP-Medium': 'Sans-Medium'}
# Japanese line breaking: these never start or end a line.
NO_START = set('、。，．・：；？！ー)）]］}｝」』】〉》〕ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ…‥々〜～.,:;!?%')
NO_END = set('(（[［{｛「『【〈《〔')
KANA = re.compile(r'[぀-ヿ、。，．・「」『』（）？！]')
SPACE = (('', ''),)


@cache
def coverage() -> dict[str, frozenset[int]]:
    for name, file in FACES.items():
        pdfmetrics.registerFont(TTFont(f'BIC-{name}', FONTS / f'{file}.ttf'))
    return {name: frozenset(pdfmetrics.getFont(f'BIC-{name}').face.charToGlyph) for name in FACES}


@lru_cache(maxsize=8192)
def runs(text: str, face: str) -> tuple[tuple[str, str], ...]:
    """Split text into (registered font, chunk) runs, falling back per character to the other script."""
    covered = coverage()
    result: list[tuple[str, str]] = []
    for char in text:
        if ord(char) in covered[face] or char == '\n':
            chosen = face
        elif ord(char) in covered[FALLBACK[face]]:
            chosen = FALLBACK[face]
        elif unicodedata.category(char)[0] in 'SC':
            continue  # Emoji and control characters that neither face can draw.
        else:
            chosen = face
        if result and result[-1][0] == f'BIC-{chosen}':
            result[-1] = (result[-1][0], result[-1][1] + char)
        else:
            result.append((f'BIC-{chosen}', char))
    return tuple(result)


@lru_cache(maxsize=8192)
def text_width(text: str, face: str, size: float) -> float:
    return sum(pdfmetrics.stringWidth(chunk, font, size) for font, chunk in runs(text, face))


def draw_text(canvas: Canvas, x: float, y: float, text: str, face: str, size: float, tracking: float = 0):
    for font, chunk in runs(text, face):
        canvas.setFont(font, size)
        canvas.drawString(x, y, chunk, charSpace=tracking)
        x += pdfmetrics.stringWidth(chunk, font, size) + tracking * len(chunk)


def rich(text: str, face: str) -> str:
    """Escaped Paragraph markup; user text can never become reportlab tags such as <img>."""
    return ''.join(escape(chunk) if font == f'BIC-{face}' else f'<font name="{font}">{escape(chunk)}</font>' for font, chunk in runs(text, face)).replace('\n', '<br/>')


def paragraph(text: str, face: str, size: float, leading: float, color=INK) -> Paragraph:
    text = re.sub(r'[^\S\n]+', ' ', text.strip())
    style = ParagraphStyle('card', fontName=f'BIC-{face}', fontSize=size, leading=leading, textColor=color, wordWrap='CJK' if JAPANESE.search(text) else None)
    return Paragraph(rich(text, face), style)


def speech_shape(canvas: Canvas, x: float, y: float, width: float, height: float, radii: tuple[float, float, float, float], fill, stroke=None):
    """A rounded rectangle with one tighter corner, like the app's speech-shaped cards."""
    top_left, top_right, bottom_right, bottom_left = radii
    k = 0.4477  # Bézier quarter-circle control offset.
    path = canvas.beginPath()
    path.moveTo(x + bottom_left, y)
    path.lineTo(x + width - bottom_right, y)
    path.curveTo(x + width - bottom_right * k, y, x + width, y + bottom_right * k, x + width, y + bottom_right)
    path.lineTo(x + width, y + height - top_right)
    path.curveTo(x + width, y + height - top_right * k, x + width - top_right * k, y + height, x + width - top_right, y + height)
    path.lineTo(x + top_left, y + height)
    path.curveTo(x + top_left * k, y + height, x, y + height - top_left * k, x, y + height - top_left)
    path.lineTo(x, y + bottom_left)
    path.curveTo(x, y + bottom_left * k, x + bottom_left * k, y, x + bottom_left, y)
    path.close()
    canvas.setFillColor(fill)
    if stroke:
        canvas.setStrokeColor(stroke)
        canvas.setLineWidth(0.8)
    canvas.drawPath(path, fill=1, stroke=1 if stroke else 0)


def ruby_parts(text: str, reading: str) -> list[tuple[str, str]]:
    """Place a word's reading over its kanji only, leaving okurigana as plain kana: 漏れて → 漏(も)れて."""
    hiragana = lambda value: ''.join(chr(ord(char) - 0x60) if 'ァ' <= char <= 'ヶ' else char for char in value)
    pieces = re.findall(r'[ぁ-ゖー]+|[^ぁ-ゖー]+', hiragana(text))
    reading = hiragana(reading)
    if hiragana(text) == reading:
        return [(text, '')]
    if len(pieces) > 1:
        match = re.fullmatch(''.join(re.escape(piece) if re.fullmatch('[ぁ-ゖー]+', piece) else '(.+?)' for piece in pieces), reading)
        if match:
            groups = iter(match.groups())
            parts, offset = [], 0
            for piece in pieces:
                kana = re.fullmatch('[ぁ-ゖー]+', piece)
                parts.append((text[offset:offset + len(piece)], '' if kana else next(groups)))
                offset += len(piece)
            return parts
    return [(text, reading)]


class RubyText(Flowable):
    """Japanese text with furigana above kanji, wrapped with simple kinsoku rules and splittable across pages."""

    def __init__(self, tokens, face: str = 'JP-Medium', size: float = 14, color=INK, ruby_size: float = 6.6, ruby_color=MUTED):
        super().__init__()
        self.tokens, self.face, self.size, self.color, self.ruby_size, self.ruby_color = tokens, face, size, color, ruby_size, ruby_color
        has_ruby = any(reading for token in tokens for _, reading in token)
        self.ruby_band = ruby_size * 1.3 if has_ruby else 0
        self.line_height = self.ruby_band + size * 1.5
        self.lines: list[list[tuple[float, int]]] = []
        self.starts: list[int] = []
        self.layout = self.place_parts()

    def place_parts(self) -> list[list[tuple[float, float, float]]]:
        """Per part: (advance, base offset, reading offset). Readings wider than their kanji may overhang
        neighbouring kana by one ruby character, so 伺う does not open a gap after 伺."""
        flat = [part for token in self.tokens for part in token]

        def room(index: int, side: int) -> float:
            if not 0 <= index < len(flat):
                return self.ruby_size
            base, reading = flat[index]
            return self.ruby_size if base and not reading and KANA.match(base[-1] if side < 0 else base[0]) else 0

        layout, index = [], 0
        for token in self.tokens:
            placed = []
            for base, reading in token:
                width = text_width(base, self.face, self.size)
                if not reading:
                    placed.append((width, 0.0, 0.0))
                else:
                    ruby = text_width(reading, 'JP', self.ruby_size)
                    excess = max(ruby - width, 0)
                    left = max(excess / 2 - room(index - 1, -1), 0)
                    right = max(excess / 2 - room(index + 1, 1), 0)
                    placed.append((left + width + right, left, left + (width - ruby) / 2))
                index += 1
            layout.append(placed)
        return layout

    @classmethod
    def from_segments(cls, segments: list[dict], **style):
        tokens: list[tuple] = []
        glue = False

        def add(parts):
            nonlocal glue
            if tokens and tokens[-1] is not SPACE and (glue or parts[0][0][0] in NO_START):
                tokens[-1] = tokens[-1] + tuple(parts)
            else:
                tokens.append(tuple(parts))
            glue = parts[-1][0][-1] in NO_END

        for segment in segments:
            text, reading = segment['text'], segment.get('reading', '')
            if reading and re.search(r'[々一-鿿0-9０-９]', text):
                add(ruby_parts(text, reading))
                continue
            # Latin words stay whole; Japanese may break between any two characters.
            for word in re.findall(r'\s+|[A-Za-z0-9０-９À-ɏ\'’-]{1,24}|.', text):
                if word.isspace():
                    if tokens and tokens[-1] is not SPACE:
                        tokens.append(SPACE)
                        glue = False
                else:
                    add([(word, '')])
        return cls(tokens, **style)

    def wrap(self, availWidth, availHeight):
        self.lines, self.starts = [], []
        line, width, pending = [], 0.0, 0.0
        space = text_width(' ', self.face, self.size)
        for index, token in enumerate(self.tokens):
            if token is SPACE:
                pending = space if line else 0
                continue
            token_width = sum(advance for advance, _, _ in self.layout[index])
            if line and width + pending + token_width > availWidth:
                self.lines.append(line)
                line, width, pending = [], 0.0, 0.0
            if not line:
                self.starts.append(index)
            line.append((width + pending, index))
            width += pending + token_width
            pending = 0
        if line:
            self.lines.append(line)
        self.width, self.height = availWidth, len(self.lines) * self.line_height
        return self.width, self.height

    def split(self, availWidth, availHeight):
        self.wrap(availWidth, availHeight)
        fit = int(availHeight // self.line_height)
        if fit <= 0:
            return []
        if fit >= len(self.lines):
            return [self]
        style = dict(face=self.face, size=self.size, color=self.color, ruby_size=self.ruby_size, ruby_color=self.ruby_color)
        cut = self.starts[fit]
        return [RubyText(self.tokens[:cut], **style), RubyText(self.tokens[cut:], **style)]

    def draw(self):
        canvas = self.canv
        for number, line in enumerate(self.lines):
            top = self.height - number * self.line_height
            base_y = top - self.ruby_band - self.size * 1.0
            ruby_y = top - self.ruby_size * 0.95
            for x, index in line:
                for (base, reading), (advance, base_offset, ruby_offset) in zip(self.tokens[index], self.layout[index]):
                    if reading:
                        canvas.setFillColor(self.ruby_color)
                        draw_text(canvas, x + ruby_offset, ruby_y, reading, 'JP', self.ruby_size)
                    canvas.setFillColor(self.color)
                    draw_text(canvas, x + base_offset, base_y, base, self.face, self.size)
                    x += advance


class Bubble(Flowable):
    """One speech-shaped card: a tracked label above stacked content, split across pages only when long."""
    PAD_X, PAD_Y, LABEL = 16, 12, 14
    SPLIT_HEIGHT, SPLIT_ROOM = FRAME_HEIGHT * 0.4, 110  # Only long cards split, and only into a useful amount of room.

    def __init__(self, label: str, content: list[tuple[Flowable, float]], fill=TINT, stroke=None, label_color=MUTED, align='left', ratio=1.0, tail='left', continued=False):
        super().__init__()
        self.label, self.content, self.fill, self.stroke, self.label_color, self.align, self.ratio, self.tail, self.continued = label, content, fill, stroke, label_color, align, ratio, tail, continued

    def wrap(self, availWidth, availHeight):
        self.outer = availWidth
        self.bubble_width = availWidth * self.ratio
        inner = self.bubble_width - 2 * self.PAD_X
        self.sizes = [flowable.wrap(inner, FRAME_HEIGHT)[1] for flowable, _ in self.content]
        self.height = 2 * self.PAD_Y + self.LABEL + sum(height + gap for height, (_, gap) in zip(self.sizes, self.content))
        return availWidth, self.height

    def split(self, availWidth, availHeight):
        self.wrap(availWidth, availHeight)
        if self.height <= availHeight:
            return [self]
        if self.height < self.SPLIT_HEIGHT or availHeight < self.SPLIT_ROOM:
            return []  # Short cards move whole to the next page.
        inner = self.bubble_width - 2 * self.PAD_X
        room = availHeight - 2 * self.PAD_Y - self.LABEL
        head: list[tuple[Flowable, float]] = []
        rest = self.content
        for index, ((flowable, gap), height) in enumerate(zip(self.content, self.sizes)):
            if gap + height <= room:
                head.append((flowable, gap))
                room -= gap + height
                continue
            pieces = flowable.split(inner, room - gap) if room - gap > 0 else []
            if len(pieces) == 2:
                head.append((pieces[0], gap))
                rest = [(pieces[1], 0)] + self.content[index + 1:]
            else:
                rest = [(flowable, 0)] + self.content[index + 1:]
            break
        if not head:
            return []
        common = dict(fill=self.fill, stroke=self.stroke, label_color=self.label_color, align=self.align, ratio=self.ratio)
        return [Bubble(self.label, head, tail=None, continued=self.continued, **common), Bubble(self.label, rest, tail=self.tail, continued=True, **common)]

    def draw(self):
        canvas = self.canv
        x = self.outer - self.bubble_width if self.align == 'right' else 0
        tight = {'left': (16, 16, 16, 4), 'right': (16, 16, 4, 16)}.get(self.tail, (16, 16, 16, 16))
        speech_shape(canvas, x, 0, self.bubble_width, self.height, tight, self.fill, self.stroke)
        canvas.setFillColor(self.label_color)
        label = f'{self.label} (continued)' if self.continued else self.label
        draw_text(canvas, x + self.PAD_X, self.height - self.PAD_Y - 7, label.upper(), 'Sans-SemiBold', 7.2, tracking=0.9)
        y = self.height - self.PAD_Y - self.LABEL
        for (flowable, gap), height in zip(self.content, self.sizes):
            y -= gap + height
            flowable.drawOn(canvas, x + self.PAD_X, y)


class WordGrid(Flowable):
    """Useful words as a grid of small cards, split between rows."""
    COLUMNS, GAP, PAD = 3, 10, 12

    def __init__(self, words: list[dict], target_language: str):
        super().__init__()
        self.words, self.target_language = words, target_language

    def cell(self, word: dict) -> list[tuple[Flowable, float]]:
        japanese = self.target_language == 'ja'
        meaning, gloss = word.get('meaning', ''), ''
        english, _, translation = meaning.rpartition(';')
        if not japanese and english and JAPANESE.search(translation):
            meaning, gloss = english, translation  # English words carry a Japanese gloss: "a planned visit; 予約".
        content = [(paragraph(word['japanese'], 'JP-Medium' if japanese else 'Sans-Medium', 15 if japanese else 13, 20), 0)]
        if word.get('romaji'):
            content.append((paragraph(word['romaji'], 'Sans-Medium', 9, 12, ACCENT), 3))
        elif gloss:
            content.append((paragraph(gloss, 'JP-Medium', 9.5, 13, ACCENT), 3))
        if meaning:
            content.append((paragraph(meaning, 'Sans', 9, 12.5), 5))
        return content

    def wrap(self, availWidth, availHeight):
        self.cell_width = (availWidth - self.GAP * (self.COLUMNS - 1)) / self.COLUMNS
        self.rows = []
        for start in range(0, len(self.words), self.COLUMNS):
            cells = [self.cell(word) for word in self.words[start:start + self.COLUMNS]]
            heights = [[flowable.wrap(self.cell_width - 2 * self.PAD, FRAME_HEIGHT)[1] for flowable, _ in content] for content in cells]
            row_height = 2 * self.PAD + max(sum(height + gap for height, (_, gap) in zip(sizes, content)) for sizes, content in zip(heights, cells))
            self.rows.append((cells, heights, row_height))
        self.width, self.height = availWidth, sum(row[2] for row in self.rows) + self.GAP * max(len(self.rows) - 1, 0)
        return self.width, self.height

    def split(self, availWidth, availHeight):
        self.wrap(availWidth, availHeight)
        used, fit = 0.0, 0
        for _, _, row_height in self.rows:
            if used + row_height > availHeight:
                break
            used += row_height + self.GAP
            fit += 1
        if fit == 0:
            return []
        if fit == len(self.rows):
            return [self]
        cut = fit * self.COLUMNS
        return [WordGrid(self.words[:cut], self.target_language), WordGrid(self.words[cut:], self.target_language)]

    def draw(self):
        canvas = self.canv
        top = self.height
        for cells, heights, row_height in self.rows:
            for column, (content, sizes) in enumerate(zip(cells, heights)):
                x = column * (self.cell_width + self.GAP)
                speech_shape(canvas, x, top - row_height, self.cell_width, row_height, (12, 12, 12, 3), TINT)
                y = top - self.PAD
                for (flowable, gap), height in zip(content, sizes):
                    y -= gap + height
                    flowable.drawOn(canvas, x + self.PAD, y)
            top -= row_height + self.GAP


class Masthead(Flowable):
    """Brand mark and wordmark, with the card's name and date on the right."""

    def __init__(self, practiced_on: str):
        super().__init__()
        self.practiced_on = practiced_on

    def wrap(self, availWidth, availHeight):
        self.width, self.height = availWidth, 30
        return self.width, self.height

    def draw(self):
        canvas = self.canv
        speech_shape(canvas, 0, 1, 28, 28, (9, 9, 9, 3), ACCENT)
        canvas.setStrokeColor(SURFACE)
        canvas.setLineWidth(1.6)
        canvas.setLineCap(1)
        # The app's AudioLines mark: six bars of varying height.
        for index, half in enumerate((1.6, 5.2, 8.4, 3.6, 6.6, 1.6)):
            bar_x = 7.2 + index * 2.75
            canvas.line(bar_x, 15 - half, bar_x, 15 + half)
        canvas.setFillColor(INK)
        draw_text(canvas, 37, 9.5, 'before i call', 'Sans-SemiBold', 15.5, tracking=-0.45)
        canvas.setFillColor(ACCENT)
        draw_text(canvas, 37 + text_width('before i call', 'Sans-SemiBold', 15.5) - 0.45 * 13, 9.5, '.', 'Sans-SemiBold', 15.5)
        label = 'PRACTICE CALL CARD'
        tracking = 1.1
        canvas.setFillColor(ACCENT)
        draw_text(canvas, self.width - text_width(label, 'Sans-SemiBold', 7.2) - tracking * len(label), 18, label, 'Sans-SemiBold', 7.2, tracking)
        canvas.setFillColor(MUTED)
        draw_text(canvas, self.width - text_width(self.practiced_on, 'Sans', 9), 5, self.practiced_on, 'Sans', 9)


class SectionTitle(Flowable):
    def __init__(self, title: str, hint: str = ''):
        super().__init__()
        self.title, self.hint = title, hint

    def wrap(self, availWidth, availHeight):
        self.width, self.height = availWidth, 30
        return self.width, self.height

    def draw(self):
        canvas = self.canv
        canvas.setFillColor(INK)
        draw_text(canvas, 0, 10, self.title, 'Sans-Medium', 14, tracking=-0.2)
        if self.hint:
            canvas.setFillColor(MUTED)
            draw_text(canvas, self.width - text_width(self.hint, 'Sans', 8.5), 10.5, self.hint, 'Sans', 8.5)
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.8)
        canvas.line(0, 0, self.width, 0)


def footer(canvas: Canvas, page: int, pages: int):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN_X, 44, PAGE_WIDTH - MARGIN_X, 44)
    canvas.setFillColor(ACCENT)
    draw_text(canvas, MARGIN_X, 30, 'before i call.', 'Sans-SemiBold', 8)
    canvas.setFillColor(MUTED)
    note = 'Practice only. No real call or booking was made.'
    draw_text(canvas, MARGIN_X + text_width('before i call.', 'Sans-SemiBold', 8) + 8, 30, note, 'Sans', 8)
    number = f'{page} / {pages}'
    draw_text(canvas, PAGE_WIDTH - MARGIN_X - text_width(number, 'Sans', 8), 30, number, 'Sans', 8)
    canvas.restoreState()


class NumberedCanvas(Canvas):
    """Defers each page so the footer can show the total page count."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        for number, state in enumerate(self.pages, 1):
            self.__dict__.update(state)
            footer(self, number, len(self.pages))
            super().showPage()
        super().save()


def section(title: Flowable, body: list[Flowable]) -> list[Flowable]:
    """A heading moves to the next page with its first item rather than sit alone at the bottom of one."""
    spacer, first = body[0], body[1]
    height = first.wrap(FRAME_WIDTH, FRAME_HEIGHT)[1]
    if isinstance(first, WordGrid):
        height = first.rows[0][2]
    elif height >= Bubble.SPLIT_HEIGHT:
        height = Bubble.SPLIT_ROOM  # Long cards start on any page with this much room.
    need = title.wrap(FRAME_WIDTH, FRAME_HEIGHT)[1] + spacer.wrap(FRAME_WIDTH, FRAME_HEIGHT)[1] + height
    return [CondPageBreak(need + 1), title, *body]


def render_call_card(*, scenario: str, target_language: str, mode: str, practiced_on: date, messages: list[dict], words: list[dict]) -> bytes:
    """Messages carry role, text, romaji, meaning and, for Japanese lines, furigana segments."""
    coverage()
    japanese = target_language == 'ja'
    when = f'{practiced_on.day} {practiced_on:%B %Y}'
    story: list[Flowable] = [Masthead(when), Spacer(0, 26)]
    story.append(paragraph('Your call card', 'Sans-Medium', 30, 34))
    turns = sum(1 for message in messages if message['role'] == 'user')
    details = [f'{"Japanese" if japanese else "English"} phone practice', 'Guided example' if mode == 'demo' else 'Live practice', f'{turns} {"reply" if turns == 1 else "replies"} from you']
    story += [Spacer(0, 8), paragraph('  ·  '.join(details), 'Sans', 10, 14, MUTED), Spacer(0, 18)]
    if scenario.strip():
        story.append(Bubble('My situation', [(paragraph(scenario, 'Sans', 10.5, 16), 0)], fill=TINT, label_color=ACCENT, tail='left'))

    conversation: list[Flowable] = []
    for message in messages:
        content: list[tuple[Flowable, float]] = []
        if message.get('segments'):
            content.append((RubyText.from_segments(message['segments']), 0))
        else:
            content.append((paragraph(message['text'], 'Sans-Medium', 12.5, 18), 2))
        if message.get('romaji'):
            content.append((paragraph(message['romaji'], 'Sans-Medium', 9.5, 13.5, ACCENT), 2))
        if message.get('meaning'):
            content.append((paragraph(message['meaning'], 'Sans', 9.5, 13.5), 6))
        user = message['role'] == 'user'
        conversation += [Spacer(0, 9), Bubble('You' if user else 'Practice partner', content, fill=SURFACE if user else TINT, stroke=LINE if user else None, label_color=ACCENT if user else MUTED, align='right' if user else 'left', ratio=0.86, tail='right' if user else 'left')]
    if not conversation:
        conversation = [Spacer(0, 12), paragraph('No conversation yet.', 'Sans', 10.5, 15, MUTED)]
    story += [Spacer(0, 22), *section(SectionTitle('Your conversation', 'Japanese  ·  romaji  ·  meaning' if japanese else ''), conversation)]

    if words:
        story += [Spacer(0, 24), *section(SectionTitle('Useful words', 'From this conversation'), [Spacer(0, 12), WordGrid(words, target_language)])]
    story += [Spacer(0, 22), paragraph('This was an AI or guided rehearsal. No real appointment has been booked.', 'Sans', 8.5, 12, MUTED)]

    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM, title='Before I Call practice call card', author='Before I Call', subject=scenario[:200], creator='Before I Call', lang='ja' if japanese else 'en')
    document.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
