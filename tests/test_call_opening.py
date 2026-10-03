import unittest
from server.call_opening import call_opening

class OpeningTests(unittest.TestCase):
    def test_custom_recipient_and_language(self):
        self.assertIn('歯科医院',call_opening('I need to call my dentist.','custom','ja'))
        self.assertIn('dental reception',call_opening('歯医者に予約の電話をしたいです。','custom','en'))
        self.assertIn('配送',call_opening('I need to ask about my parcel.','custom','ja'))
    def test_unknown_does_not_assume_a_problem_or_service(self):
        opening=call_opening('I want to practise a call.','custom','ja')
        self.assertNotIn('どうされましたか',opening)
        self.assertNotIn('管理会社',opening)
        self.assertIn('ご用件',opening)
    def test_presets_have_distinct_openings(self):
        self.assertNotEqual(call_opening('', 'clinic','ja'),call_opening('', 'repair','ja'))
        self.assertIn('lost property',call_opening('', 'lost','en'))
