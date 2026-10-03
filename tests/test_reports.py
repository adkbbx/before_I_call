import unittest

import sentry_sdk
from fastapi.testclient import TestClient
from sentry_sdk.transport import Transport

from server.app import app, prompt_version, report_counts


class Capture(Transport):
    def __init__(self, options=None):
        super().__init__(options)
        self.items = []

    def capture_envelope(self, envelope):
        self.items.extend(item.payload.json for item in envelope.items if item.payload.json)


class ReplyReportTests(unittest.TestCase):
    def setUp(self):
        self.transport = Capture()
        sentry_sdk.init(dsn='https://public@sentry.example/1', transport=self.transport, send_default_pii=False)
        report_counts.clear()
        self.client = TestClient(app)
        self.report = {'conversation': '0123456789abcdef', 'prompt_version': prompt_version('ja'), 'reply_number': 3, 'reason': 'misheard', 'note': 'I said 5 minutes.'}

    def tearDown(self):
        sentry_sdk.init(dsn=None)
        report_counts.clear()

    def test_report_links_the_reply_to_its_traced_turn_and_sends_text_only_with_consent(self):
        self.assertEqual(self.client.post('/api/reports', json=self.report).json(), {'ok': True})
        event, = self.transport.items
        self.assertEqual(event['message'], 'Learner reported a partner reply: Misheard me')
        self.assertEqual((event['tags']['gen_ai.conversation.id'], event['tags']['app.turn'], event['tags']['app.prompt_version']), ('0123456789abcdef', '3', prompt_version('ja')))
        self.assertEqual(event['contexts']['learner_report']['note'], 'I said 5 minutes.')
        self.assertIsNone(event['contexts']['learner_report']['reply'])
        self.client.post('/api/reports', json={**self.report, 'reply': '六分ですね。'})
        self.assertEqual(self.transport.items[-1]['contexts']['learner_report']['reply'], '六分ですね。')

    def test_reports_are_validated_and_limited_per_practice(self):
        self.assertEqual(self.client.post('/api/reports', json={**self.report, 'conversation': 'not-a-reference'}).status_code, 422)
        self.assertEqual(self.client.post('/api/reports', json={**self.report, 'reason': 'rude'}).status_code, 422)
        codes = [self.client.post('/api/reports', json=self.report).status_code for _ in range(6)]
        self.assertEqual(codes, [200] * 5 + [429])

    def test_reporting_is_unavailable_without_sentry(self):
        sentry_sdk.init(dsn=None)
        self.assertEqual(self.client.post('/api/reports', json=self.report).status_code, 503)

    def test_prompt_version_names_the_template_per_language(self):
        self.assertRegex(prompt_version('ja'), r'^[0-9a-f]{8}$')
        self.assertNotEqual(prompt_version('ja'), prompt_version('en'))
        self.assertEqual(prompt_version('ja'), prompt_version('ja'))


if __name__ == '__main__':
    unittest.main()
