import json
import os
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from server.app import app
from server.call_card_pdf import ruby_parts

ROOT = Path(__file__).resolve().parents[1]
demo = json.loads((ROOT / 'src/demo.json').read_text(encoding='utf-8'))


class CallCardPdfTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'ANALYTICS_DB_PATH': self.directory.name + '/usage.sqlite3'})
        self.env.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.env.stop()
        self.directory.cleanup()

    def card(self, **overrides):
        turn = demo['turns'][0]
        body = {'scenario': demo['scenario'], 'target_language': 'ja', 'mode': 'demo', 'practiced_on': '2026-10-04', 'messages': [
            {'role': 'assistant', 'text': turn['japanese'], 'romaji': turn['romaji'], 'meaning': turn['meaning']},
            {'role': 'user', 'text': turn['answer']},
        ], 'words': [{'japanese': '洗濯機', 'romaji': 'sentakuki', 'meaning': 'washing machine'}]}
        return self.client.post('/api/call-card.pdf', json=body | overrides)

    def test_downloads_a_pdf_with_embedded_brand_fonts(self):
        response = self.card()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['content-type'], 'application/pdf')
        self.assertIn('attachment; filename="before-i-call-practice-card.pdf"', response.headers['content-disposition'])
        self.assertTrue(response.content.startswith(b'%PDF'))
        # Fonts are embedded, so Japanese renders in any viewer without an Asian font pack.
        self.assertIn(b'/FontFile2', response.content)
        self.assertIn(b'/Lang (ja)', response.content)

    def test_user_text_is_never_read_as_markup(self):
        script = '<img src="server/app.py" width="50" height="50"/><b>bold</b> & <font name="x">'
        response = self.card(scenario=script, messages=[{'role': 'user', 'text': script, 'romaji': script, 'meaning': script}], words=[{'japanese': script, 'meaning': script}])
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(b'/Subtype /Image', response.content)

    def test_long_turns_continue_across_pages(self):
        long_turn = ('来週の火曜日の午後７時以降なら家にいますので、その時間に来ていただけると助かります。' * 40)[:2000]
        response = self.card(messages=[{'role': 'user', 'text': long_turn}, {'role': 'assistant', 'text': long_turn}])
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(re.findall(rb'/Type /Page\b', response.content)), 2)

    def test_english_cards_and_empty_conversations_render(self):
        english = self.card(target_language='en', mode='live', messages=[{'role': 'user', 'text': 'Could I reschedule my appointment?'}], words=[{'japanese': 'appointment', 'meaning': 'a planned meeting or visit; 予約'}])
        self.assertEqual(english.status_code, 200)
        self.assertIn(b'/Lang (en)', english.content)
        self.assertEqual(self.card(messages=[], words=[]).status_code, 200)

    def test_rejects_other_origins_and_oversized_cards(self):
        self.assertEqual(self.client.post('/api/call-card.pdf', headers={'Origin': 'https://unrelated.example'}, json={'messages': []}).status_code, 403)
        turn = {'role': 'user', 'text': 'あ' * 2000, 'romaji': 'a' * 6000, 'meaning': 'x' * 2000}
        self.assertEqual(self.card(messages=[turn] * 10).status_code, 413)

    def test_furigana_sits_over_kanji_and_leaves_okurigana_plain(self):
        self.assertEqual(ruby_parts('漏れて', 'もれて'), [('漏', 'も'), ('れて', '')])
        self.assertEqual(ruby_parts('取り消し', 'とりけし'), [('取', 'と'), ('り', ''), ('消', 'け'), ('し', '')])
        self.assertEqual(ruby_parts('洗濯機', 'せんたくき'), [('洗濯機', 'せんたくき')])
        self.assertEqual(ruby_parts('お願い', 'おねがい'), [('お', ''), ('願', 'ねが'), ('い', '')])


if __name__ == '__main__':
    unittest.main()
