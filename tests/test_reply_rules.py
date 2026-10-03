import unittest

from server.reply_rules import check, last_learner_message


class ReplyRuleTests(unittest.TestCase):
    def test_goodbye_without_end_call_is_a_missed_hang_up(self):
        for learner in ('以上です。さようなら。', 'いいえ、大丈夫です。ありがとうございました。', "No, that's all. Goodbye."):
            self.assertEqual(check(learner, 'お電話ありがとうございました。', [], True), (['missed_hang_up'], True))
            self.assertEqual(check(learner, 'お電話ありがとうございました。', ['end_call'], True), ([], True))

    def test_mid_call_answers_are_not_goodbyes_and_interrupted_replies_are_not_judged(self):
        self.assertEqual(check('木曜日の午後は大丈夫です。', 'かしこまりました。', [], True), ([], False))
        self.assertEqual(check('ありがとうございます。', 'どういたしまして。', [], True), ([], False))
        self.assertEqual(check('以上です。', 'お電話', [], False), ([], True))

    def test_booking_claims_are_flagged_but_checking_is_allowed(self):
        self.assertIn('claimed_booking', check(None, 'ご予約を承りました。', [], True)[0])
        self.assertIn('claimed_booking', check(None, 'Your appointment is confirmed for Friday.', [], True)[0])
        self.assertEqual(check(None, '担当者に確認いたします。', [], True)[0], [])
        self.assertEqual(check(None, 'I will check with the technician.', [], True)[0], [])

    def test_digits_and_latin_letters_in_japanese_speech(self):
        self.assertEqual(check(None, '夜7時以降ですね。', [], True)[0], ['digits_in_japanese_speech'])
        self.assertEqual(check(None, 'OKです。', [], True)[0], ['english_in_japanese_speech'])
        self.assertEqual(check(None, 'Your number is 12345.', [], True)[0], [])

    def test_only_a_direct_learner_turn_is_checked(self):
        self.assertEqual(last_learner_message([{'role': 'assistant', 'content': 'はい'}, {'role': 'user', 'content': [{'type': 'text', 'text': '以上です'}]}]), '以上です')
        self.assertIsNone(last_learner_message([{'role': 'user', 'content': '以上です'}, {'role': 'tool', 'content': '{}'}]))
        self.assertIsNone(last_learner_message([]))


if __name__ == '__main__':
    unittest.main()
