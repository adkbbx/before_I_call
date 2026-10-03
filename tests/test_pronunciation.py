import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch
import httpx
from fastapi.testclient import TestClient
from server.app import app, sessions, Session
from server.pronunciation import speech_text, dictionary_rules


class PronunciationTests(unittest.TestCase):
    def test_work_reply_topic_particle_is_wa(self):
        self.assertEqual(speech_text('午後は仕事です。夜７時以降なら家にいます。'), 'ごご わ しごとです。よる しちじ いこうなら家にいます。')

    def test_uketori_reading_covers_the_complete_word(self):
        self.assertEqual(speech_text('お受け取りできますか？'), 'おうけとりできますか？')
        words = json.loads(Path('src/japanese-lexicon.json').read_text(encoding='utf-8'))
        self.assertEqual(next(word['reading'] for word in words if word['text'] == '受け取り'), 'うけとり')

    def test_shosho_uses_the_whole_word_reading(self):
        self.assertEqual(speech_text('少々お待ちください。'), 'しょうしょうお待ちください。')
        words = json.loads(Path('src/japanese-lexicon.json').read_text(encoding='utf-8'))
        self.assertEqual(next(word['reading'] for word in words if word['text'] == '少々'), 'しょうしょう')

    def test_photo_request_and_reply_use_okuru(self):
        self.assertEqual(speech_text('写真を送っていただけますか？'), 'しゃしんをオクッテ いただけますか？')
        self.assertEqual(speech_text('はい、写真を送ります。'), 'はい、しゃしんをおくります。')

    def test_water_leak_phrases_use_mizu_for_both_demo_voices(self):
        self.assertEqual(speech_text('洗濯機から水が漏れています。'), 'せんたくきからみずがもれています。')
        self.assertEqual(speech_text('水はいつ漏れますか？'), 'みずはいつもれますか？')
        self.assertEqual(speech_text('水が漏れている場所の写真'), 'みずがもれているばしょのしゃしん')
        self.assertEqual(speech_text('水曜日、水道、香水、誰'), 'すいようび、水道、香水、誰')

    def test_reported_readings_and_compounds(self):
        self.assertEqual(speech_text('洗濯機を洗っている場所に明日伺いたい。夜７時以降です。'), 'せんたくきをあらっているばしょにあしたうかがいたい。よる しちじ いこうです。')
        self.assertEqual(speech_text('水曜日に排水と水道を確認します。'), 'すいようびにはいすいと水道をかくにんします。')
        for source in ['夜７時以降', '夜7時以降', '夜七時以降']:
            self.assertEqual(speech_text(source), 'よる しちじ いこう')
        self.assertEqual(speech_text('明日 at 7', 'en'), '明日 at 7')

    def test_replay_sends_corrected_speech_and_preserves_language(self):
        real_client = httpx.AsyncClient
        for language, expected in [('ja', 'あしたせんたくきをかくにんします。'), ('en', '明日洗濯機を確認します。')]:
            def handler(request):
                body = json.loads(request.content)
                self.assertEqual(body['text'], expected)
                self.assertEqual(body['language_code'], language)
                return httpx.Response(200, content=b'audio')
            sessions['pronunciation-test'] = Session('pronunciation-test', target_language=language)
            try:
                with patch.dict(os.environ, {'ELEVENLABS_API_KEY': 'test', 'ELEVENLABS_VOICE_ID': 'test'}), patch('server.app.httpx.AsyncClient', side_effect=lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs)):
                    response = TestClient(app).post('/api/sessions/pronunciation-test/speech', json={'text': '明日洗濯機を確認します。'})
                    self.assertEqual(response.status_code, 200)
            finally:
                sessions.pop('pronunciation-test', None)

    def test_live_dictionary_preserves_existing_and_is_idempotent(self):
        spec = importlib.util.spec_from_file_location('configure_pronunciation', Path('scripts/configure-pronunciation.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        state = {'locators': [{'pronunciation_dictionary_id': 'existing', 'version_id': 'v1'}], 'creates': 0, 'patches': 0}
        def handler(request):
            path = request.url.path
            if request.method == 'GET' and path.endswith('/agents/test'):
                return httpx.Response(200, json={'conversation_config': {'tts': {'pronunciation_dictionary_locators': state['locators']}}})
            if request.method == 'GET':
                return httpx.Response(200, json={'name': 'Existing dictionary'} if path.endswith('/existing') else {'name': state['name'], 'latest_version_id': 'v2', 'rules': state['rules']})
            body = json.loads(request.content)
            if request.method == 'POST':
                state['creates'] += 1
                state['name'] = body['name']
                state['rules'] = body['rules']
                self.assertIn({'type': 'alias', 'string_to_replace': '明日', 'alias': 'あした'}, body['rules'])
                return httpx.Response(200, json={'id': 'new', 'version_id': 'v2'})
            state['patches'] += 1
            state['locators'] = body['conversation_config']['tts']['pronunciation_dictionary_locators']
            return httpx.Response(200, json={})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            module.configure(client, 'test')
            module.configure(client, 'test')
        self.assertEqual(state['creates'], 1)
        self.assertEqual(state['patches'], 1)
        self.assertEqual(state['locators'][-1]['pronunciation_dictionary_id'], 'existing')

    def test_calendar_and_relative_days(self):
        examples = {
            '今日、明日、明後日、一昨日、昨日': 'きょう、あした、あさって、おととい、きのう',
            '4月14日、７月２０日、九月二十四日': 'しがつじゅうよっか、しちがつはつか、くがつにじゅうよっか',
            '1月1日、１２月一日、四月１日': 'いちがつ ついたち、じゅうにがつ ついたち、しがつ ついたち',
            '1日間、1日中、1日後、毎月1日': 'いちにちかん、いちにちじゅう、いちにちご、まいつきついたち',
            '一日、一月、二月、十分な余裕': '一日、一月、二月、十分な余裕',
            '来週の火曜日、再来月の平日': 'らいしゅうのかようび、さらいげつのへいじつ',
            '17日、19日、27日、29日': 'じゅうしちにち、じゅうくにち、にじゅうしちにち、にじゅうくにち',
        }
        for original, expected in examples.items():
            with self.subTest(original=original):
                self.assertEqual(speech_text(original), expected)

    def test_time_and_counter_sound_changes(self):
        examples = {
            '午前4時、午後7時半、9時30分': 'ごぜんよじ、ごごしちじはん、くじさんじゅっぷん',
            '七時十分、20分間、六十分間': 'しちじ じゅっぷん、にじゅっぷんかん、ろくじゅっぷんかん',
            '1分、3分、6分、8分、10分': 'いっぷん、さんぷん、ろっぷん、はっぷん、じゅっぷん',
            '24時間、1週間、6ヶ月、20か月': 'にじゅうよじかん、いっしゅうかん、ろっかげつ、にじゅっかげつ',
            '1人、2人、4人、14人': 'ひとり、ふたり、よにん、じゅうよにん',
            '一人称、一人前、二人称': 'いちにんしょう、いちにんまえ、ににんしょう',
            '1本、3本、6本、8本、20本、30個': 'いっぽん、さんぼん、ろっぽん、はっぽん、にじゅっぽん、さんじゅっこ',
            '3回、3階、6階、8冊、2枚、5台': 'さんかい、さんがい、ろっかい、はっさつ、にまい、ごだい',
            '三分の一、3分の1': 'さんぶんの一、さんぶんの1',
            '100分、123人、百七時、100月、32日': '100分、123人、百七時、100月、32日',
        }
        for original, expected in examples.items():
            with self.subTest(original=original):
                self.assertEqual(speech_text(original), expected)

    def test_export_rules_use_longest_match_first_and_skip_ambiguous_words(self):
        rules = dictionary_rules()
        words = [rule['string_to_replace'] for rule in rules]
        self.assertEqual(len(words), len(set(words)))
        self.assertEqual(list(map(len, words)), sorted(map(len, words), reverse=True))
        for unsafe in ('1日', '１日', '一日', '一月', '二月', '十分', '水', '時', '日', '月', '人', '分'):
            self.assertNotIn(unsafe, words)
        self.assertLess(words.index('4月1日'), words.index('4月'))
        self.assertLess(words.index('1時間'), words.index('1時'))
        self.assertTrue(all(rule['type'] == 'alias' and rule['alias'] for rule in rules))
