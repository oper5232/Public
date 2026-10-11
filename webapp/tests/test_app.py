import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import AI, ApiError, DemoStore, NotionStore, Service, handler, rich


class StoreFixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'demo.sqlite'
        self.store = DemoStore(self.path)
        self.service = Service(self.store, AI(enabled=False))
        self.job = next(c for c in self.store.all('candidate') if c['status'] == '승인')
        self.pending = next(c for c in self.store.all('candidate') if c['status'] == '검토대기')
        self.q = self.store.questions(self.job['id'])[0]
        self.path_q = f"/api/candidates/{self.job['id']}/questions/{self.q['id']}"

    def tearDown(self):
        self.store.db.close()
        self.tmp.cleanup()

    def call(self, method, path, body=None, query=None):
        return self.service.dispatch(method, path, body or {}, query or {})

    def error(self, status, method, path, body=None):
        with self.assertRaises(ApiError) as caught:
            self.call(method, path, body)
        self.assertEqual(caught.exception.status, status)

    def body(self, **changes):
        return dict({'version': self.q['version'], 'answer': '확인된 경험을 바탕으로 작성한 답변',
                     'method': '직접 작성', 'status': '작성중'}, **changes)


class ServiceTests(StoreFixture):
    def test_progress_tracks_saved_completion_and_next_question(self):
        path = f"/api/candidates/{self.job['id']}/progress"
        initial = self.call('GET', path)
        self.assertEqual((initial['total'], initial['pending'], initial['percent']), (2, 2, 0))
        self.assertEqual(initial['next_id'], self.q['id'])
        self.assertNotIn('answer', json.dumps(initial))
        saved = self.call('PATCH', self.path_q, self.body(status='완료'))
        progress = self.call('GET', path)
        second = self.store.questions(self.job['id'])[1]
        self.assertEqual((progress['completed'], progress['percent'], progress['next_id']),
                         (1, 50, second['id']))
        self.store.save_question(second, '둘째 답변', '직접 작성', '완료')
        progress = self.call('GET', path)
        self.assertTrue(progress['all_completed'])
        self.assertIsNone(progress['next_id'])
        self.assertEqual(progress['percent'], 100)
        self.call('PATCH', self.path_q, self.body(version=saved['version'], status='작성중'))
        progress = self.call('GET', path)
        self.assertFalse(progress['all_completed'])
        self.assertEqual((progress['writing'], progress['next_id']), (1, self.q['id']))
        self.assertEqual(self.call('GET', f"/api/candidates/{self.job['id']}/questions")['progress'], progress)

    def test_progress_requires_current_approval(self):
        path = f"/api/candidates/{self.job['id']}/progress"
        for state in ('검토대기', '보류', '제외'):
            self.store.set_status(self.store.get_candidate(self.job['id']), state)
            self.error(403, 'GET', path)

    def test_empty_and_invalid_completion_are_not_all_complete(self):
        from app import writing_progress
        self.assertEqual(writing_progress([])['percent'], 0)
        self.assertFalse(writing_progress([])['all_completed'])
        self.store.save_question(self.q, '  ', '직접 작성', '완료')
        p = self.call('GET', f"/api/candidates/{self.job['id']}/progress")
        self.assertEqual((p['completed'], p['writing'], p['invalid_completed']), (0, 1, 1))
        self.assertEqual(p['next_id'], self.q['id'])

    def test_list_and_approved_question_link(self):
        result = self.call('GET', '/api/candidates', query={'status': ['승인']})
        self.assertEqual([c['id'] for c in result['items']], [self.job['id']])
        result = self.call('GET', f"/api/candidates/{self.job['id']}/questions")
        self.assertEqual(len(result['items']), 2)
        self.assertTrue(all(q['candidate_id'] == self.job['id'] for q in result['items']))

    def test_all_unapproved_states_block_read_and_save(self):
        for state in ('검토대기', '보류', '제외'):
            self.store.set_status(self.store.get_candidate(self.job['id']), state)
            self.error(403, 'GET', f"/api/candidates/{self.job['id']}/questions")
            self.error(403, 'PATCH', self.path_q, self.body())
            self.error(403, 'POST', self.path_q + '/draft', {'version': self.q['version']})
        self.assertEqual(self.store.questions(self.job['id'])[0]['answer'], '')

    def test_other_candidate_question_rejected(self):
        other = self.store.questions(self.pending['id'])[0]
        self.error(404, 'PATCH', f"/api/candidates/{self.job['id']}/questions/{other['id']}", self.body())
        self.assertEqual(self.store.questions(self.pending['id'])[0]['answer'], '')

    def test_save_and_reload_after_restart(self):
        saved = self.call('PATCH', self.path_q, self.body())
        self.assertEqual(saved['status'], '작성중')
        self.assertNotEqual(saved['version'], self.q['version'])
        other = DemoStore(self.path)
        try:
            self.assertEqual(other.questions(self.job['id'])[0]['answer'], self.body()['answer'])
        finally:
            other.db.close()

    def test_stale_answer_does_not_overwrite(self):
        self.call('PATCH', self.path_q, self.body(answer='새 답변'))
        self.error(409, 'PATCH', self.path_q, self.body(answer='오래된 답변'))
        self.assertEqual(self.store.questions(self.job['id'])[0]['answer'], '새 답변')

    def test_status_version_and_noop(self):
        path = f"/api/candidates/{self.job['id']}/status"
        same = self.call('PATCH', path, {'status': '승인', 'version': self.job['version']})
        self.assertEqual(same['version'], self.job['version'])
        result = self.call('PATCH', path, {'status': '보류', 'version': self.job['version']})
        self.assertEqual(result['status'], '보류')
        self.error(409, 'PATCH', path, {'status': '승인', 'version': self.job['version']})

    def test_exact_select_values_only(self):
        for changes in ({'method': 'AI 초안'}, {'status': '초안완료'}):
            self.error(422, 'PATCH', self.path_q, self.body(**changes))
        self.error(422, 'PATCH', f"/api/candidates/{self.job['id']}/status",
                   {'status': '승인됨', 'version': self.job['version']})

    def test_empty_completion_and_character_limit(self):
        self.error(422, 'PATCH', self.path_q, self.body(answer=' ', status='완료'))
        self.error(422, 'PATCH', self.path_q, self.body(answer='가' * 1001))
        result = self.call('PATCH', self.path_q, self.body(answer='가' * 1000, status='완료'))
        self.assertEqual(result['status'], '완료')

    def test_ai_unconfigured_does_not_claim_generated_answer(self):
        self.error(503, 'POST', self.path_q + '/draft', {'version': self.q['version']})
        self.assertEqual(self.store.questions(self.job['id'])[0]['answer'], '')

    def test_ai_saves_as_writing_not_complete(self):
        class FakeAI:
            ready = True
            def generate(self, job, q): return '합성 AI 응답 · 테스트용'
        self.service.ai = FakeAI()
        saved = self.call('POST', self.path_q + '/draft', {'version': self.q['version']})
        self.assertEqual((saved['method'], saved['status']), ('AI초안', '작성중'))

    def test_ai_never_overwrites_existing_answer(self):
        saved = self.call('PATCH', self.path_q, self.body())
        self.error(409, 'POST', self.path_q + '/draft', {'version': saved['version']})

    def test_approval_revoked_during_ai_blocks_publication(self):
        store = self.store
        class RevokingAI:
            ready = True
            def generate(self, job, q):
                store.set_status(store.get_candidate(job['id']), '보류')
                return '늦게 도착한 응답'
        self.service.ai = RevokingAI()
        self.error(403, 'POST', self.path_q + '/draft', {'version': self.q['version']})
        self.assertEqual(self.store.questions(self.job['id'])[0]['answer'], '')

    def test_question_changed_during_ai_blocks_publication(self):
        store = self.store
        class EditingAI:
            ready = True
            def generate(self, job, q):
                store.save_question(q, '다른 화면의 답변', '직접 작성', '작성중')
                return '늦게 도착한 응답'
        self.service.ai = EditingAI()
        self.error(409, 'POST', self.path_q + '/draft', {'version': self.q['version']})
        self.assertEqual(self.store.questions(self.job['id'])[0]['answer'], '다른 화면의 답변')


class HttpTests(StoreFixture):
    def test_http_csrf_origin_static_and_persisted_save(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler(self.service))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{server.server_port}'
        def request(path, method='GET', body=None, headers=None):
            req = Request(base + path, method=method,
                data=json.dumps(body).encode() if body is not None else None,
                headers=headers or {})
            return urlopen(req, timeout=5)
        try:
            with request('/api/config') as r:
                config = json.load(r)
                self.assertFalse(config['ai_ready'])
                self.assertEqual(config['mode'], 'demo')
            with request('/') as r:
                self.assertIn(b'JOB HARVEST', r.read())
                self.assertIn("frame-ancestors 'none'", r.headers['Content-Security-Policy'])
            with self.assertRaises(HTTPError) as caught:
                request(self.path_q, 'PATCH', self.body(), {'Content-Type': 'application/json'})
            self.assertEqual(caught.exception.code, 403)
            headers = {'Content-Type': 'application/json', 'X-CSRF-Token': config['csrf'], 'Origin': 'https://evil.example'}
            with self.assertRaises(HTTPError) as caught:
                request(self.path_q, 'PATCH', self.body(), headers)
            self.assertEqual(caught.exception.code, 403)
            headers['Origin'] = base
            with request(self.path_q, 'PATCH', self.body(), headers) as r:
                self.assertEqual(json.load(r)['answer'], self.body()['answer'])
            with self.assertRaises(HTTPError) as caught:
                request('/api/config', headers={'Host': 'evil.example'})
            self.assertEqual(caught.exception.code, 403)
            with self.assertRaises(HTTPError) as caught:
                request('/.env')
            self.assertEqual(caught.exception.code, 404)
        finally:
            server.shutdown(); server.server_close(); thread.join()


class NotionContractTests(unittest.TestCase):
    def schema_store(self, options):
        class Schema(NotionStore):
            def request(self, method, path, body=None):
                if method == 'PATCH':
                    self.saved = body['properties']
                    return {'id': 'page', 'properties': body['properties']}
                if path.endswith(self.candidates_id):
                    return {'properties': {'후보ID': {'type': 'rich_text'}, '후보명': {'type': 'title'},
                        '사용자상태': {'type': 'select', 'select': {'options': [{'name': n} for n in ('검토대기','승인','보류','제외')]}}}}
                props = {n: {'type': t} for n,t in [('문항명','title'),('글자수제한','number'),
                    ('답변초안','rich_text'),('문항내용','rich_text'),('문항번호','number'),('후보ID','rich_text')]}
                props['작성방식'] = {'type':'select','select':{'options':[{'name':n} for n in options]}}
                props['작성상태'] = {'type':'select','select':{'options':[{'name':n} for n in ('입력대기','작성중','완료')]}}
                return {'properties': props}
        return Schema('not-real',str(__import__('uuid').uuid4()),str(__import__('uuid').uuid4()))

    def test_method_spacing_is_accepted_and_actual_option_is_written(self):
        store = self.schema_store(['AI 초안', '직접작성 '])
        store.validate_schema()
        saved = store.save_question({'id':'page'}, '답변', '직접 작성', '작성중')
        self.assertEqual(store.saved['작성방식']['select']['name'], '직접작성 ')
        self.assertEqual(saved['method'], '직접 작성')
        self.assertEqual(saved['method_option'], '직접작성 ')

    def test_existing_method_option_preserved_when_both_variants_exist(self):
        store = self.schema_store(['AI초안','AI 초안','직접 작성'])
        store.validate_schema()
        store.save_question({'id':'page','method_option':'AI 초안'}, '답변', 'AI초안', '작성중')
        self.assertEqual(store.saved['작성방식']['select']['name'], 'AI 초안')

    def test_missing_method_error_identifies_db_and_actual_options(self):
        store = self.schema_store(['AI초안','수동'])
        with self.assertRaises(ApiError) as caught: store.validate_schema()
        self.assertIn('자소서 문항 DB', caught.exception.message)
        self.assertIn('직접 작성', caught.exception.message)
        self.assertIn('수동', caught.exception.message)
        self.assertIn(store.questions_id, caught.exception.message)

    def test_company_size_is_optional_and_not_inferred(self):
        from app import candidate
        page = {'id': 'page', 'properties': {'회사': {'rich_text': [{'text': {'content': '대기업 계열사'}}]}}}
        self.assertIsNone(candidate(page)['company_size'])
        page['properties']['기업규모'] = {'select': {'name': '중견기업'}}
        self.assertEqual(candidate(page)['company_size'], '중견기업')

    def test_rate_limited_query_retries_but_write_does_not(self):
        import io
        from unittest.mock import patch
        from urllib.error import HTTPError
        store = NotionStore('not-real', str(__import__('uuid').uuid4()), str(__import__('uuid').uuid4()))
        def limited(): return HTTPError('https://api.notion.com/v1/test', 429, 'rate limited', {'Retry-After': '0'}, None)
        with patch('app.urlopen', side_effect=[limited(), io.BytesIO(b'{"results": []}')]) as request:
            self.assertEqual(store.request('POST', 'data_sources/test/query', {}), {'results': []})
            self.assertEqual(request.call_count, 2)
        with patch('app.urlopen', side_effect=limited()) as request:
            with self.assertRaises(ApiError): store.request('PATCH', 'pages/test', {})
            self.assertEqual(request.call_count, 1)

    def test_exact_properties_and_long_answer_not_truncated(self):
        class Capture(NotionStore):
            def request(self, method, path, body=None):
                self.call = method, path, body
                return {'id': 'page', 'properties': body['properties']}
        store = Capture('not-real', str(__import__('uuid').uuid4()), str(__import__('uuid').uuid4()))
        store.save_question({'id': 'page'}, '가' * 4000, 'AI초안', '작성중')
        props = store.call[2]['properties']
        self.assertEqual(set(props), {'답변초안', '작성방식', '작성상태'})
        self.assertEqual(props['작성방식']['select']['name'], 'AI초안')
        chunks = props['답변초안']['rich_text']
        self.assertEqual(''.join(c['text']['content'] for c in chunks), '가' * 4000)
        self.assertTrue(all(len(c['text']['content']) <= 1800 for c in chunks))

    def test_question_query_uses_text_candidate_id_and_pagination(self):
        class Capture(NotionStore):
            calls = []
            def request(self, method, path, body=None):
                self.calls.append(body)
                if len(self.calls) == 1:
                    return {'results': [], 'has_more': True, 'next_cursor': 'next'}
                return {'results': [], 'has_more': False}
        store = Capture('not-real', str(__import__('uuid').uuid4()), str(__import__('uuid').uuid4()))
        self.assertEqual(store.questions('logical-candidate-id'), [])
        self.assertEqual(store.calls[0]['filter'], {'property': '후보ID', 'rich_text': {'equals': 'logical-candidate-id'}})
        self.assertEqual(store.calls[1]['start_cursor'], 'next')

    def test_duplicate_candidate_is_not_arbitrarily_selected(self):
        class Duplicate(NotionStore):
            def request(self, *args): return {'results': [{'id': 'one'}, {'id': 'two'}]}
        store = Duplicate('not-real', str(__import__('uuid').uuid4()), str(__import__('uuid').uuid4()))
        with self.assertRaises(ApiError) as caught: store.get_candidate('id')
        self.assertEqual(caught.exception.status, 409)

    def test_schema_mismatch_stops_before_writing(self):
        class Mismatch(NotionStore):
            def request(self, method, *args):
                self.assert_method = method
                return {'properties': {'후보ID': {'type': 'relation'}}}
        store = Mismatch('not-real', str(__import__('uuid').uuid4()), str(__import__('uuid').uuid4()))
        with self.assertRaises(ApiError) as caught: store.validate_schema()
        self.assertEqual(caught.exception.status, 422)
        self.assertEqual(store.assert_method, 'GET')


if __name__ == '__main__':
    unittest.main()
