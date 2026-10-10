import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pipeline import Pipeline, normalize

JOB=json.loads((Path(__file__).resolve().parents[1]/'fixtures/manual_job.json').read_text())['job']
class FakeNotion:
    def __init__(self): self.pages={}; self.fail=False; self.fail_query=False; self.timeout_after_create=False
    def find(self,cid):
        if self.fail_query: raise RuntimeError('query outage')
        return [{'id':cid}] if cid in self.pages else []
    def write(self,cid,data,page_id=None):
        if self.fail: raise RuntimeError('outage')
        self.pages[cid]=data
        if self.timeout_after_create:
            self.timeout_after_create=False
            raise RuntimeError('timeout')
        return {'id':cid}

class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=str(Path(self.tmp.name)/'state.sqlite')
        self.notion=FakeNotion(); self.p=Pipeline(self.path,self.notion)
    def tearDown(self): self.p.db.close();self.tmp.cleanup()
    def test_new_pending_no_score(self):
        r=self.p.ingest(JOB,'a'); self.assertEqual(r['result'],'신규')
        d=json.loads(self.p.db.execute('SELECT data FROM candidates').fetchone()[0])
        self.assertEqual(d['decision'],'대상'); self.assertNotIn('score',d)
    def test_same_job_new_request(self):
        a=self.p.ingest(JOB,'a');b=self.p.ingest(JOB,'b');self.assertEqual(a['candidate_id'],b['candidate_id'])
        self.assertEqual(b['result'],'동일공고')
    def test_request_replay_and_collision(self):
        a=self.p.ingest(JOB,'a');self.assertEqual(a,self.p.ingest(JOB,'a'))
        job=dict(JOB,title='다른 내용')
        with self.assertRaises(ValueError):self.p.ingest(job,'a')
    def test_new_version_preserves_decision(self):
        a=self.p.ingest(JOB,'a')
        with self.p.db:self.p.db.execute("UPDATE candidates SET user_state='보류' WHERE id=?",(a['candidate_id'],))
        b=self.p.ingest(dict(JOB,title='수정공고'),'b');self.assertEqual(b['version'],2);self.assertEqual(b['user_state'],'보류')
    def test_distinct_unit_round_site(self):
        ids=[self.p.ingest(j,str(i))['candidate_id'] for i,j in enumerate([JOB,dict(JOB,unit='전력'),dict(JOB,round='new'),dict(JOB,url='https://other.example/jobs/1')])]
        self.assertEqual(len(set(ids)),4)
    def test_missing_info_not_excluded(self):
        d=normalize({'url':'https://example.org/1'});self.assertEqual(d['decision'],'판단보류');self.assertIn('duties',d['missing'])
    def test_numeric_required_experience_gate(self):
        d=normalize(dict(JOB,required_min_years=4,has_entry_or_alternative=False))
        self.assertEqual(d['decision'],'대상외')
        self.assertEqual(normalize(dict(JOB,required_min_years=4,has_entry_or_alternative=True))['decision'],'대상')
    def test_unsafe_url(self):
        for url in ['file:///tmp/x','http://127.0.0.1/x','https://user:pass@example.org/x','https://localhost/x']:
            with self.assertRaises(ValueError):normalize({'url':url})
    def test_notion_outage_restart_recovery(self):
        self.p.ingest(JOB,'a');self.notion.fail_query=True
        self.assertEqual(self.p.sync()['errors'],1)
        self.assertEqual(self.p.db.execute('SELECT state FROM candidates').fetchone()[0],'오류')
        self.p.db.close();self.p=Pipeline(self.path,self.notion);self.notion.fail_query=False
        self.assertEqual(self.p.sync()['synced'],1);self.assertEqual(len(self.notion.pages),1)
    def test_timeout_created_page_reconciled(self):
        self.p.ingest(JOB,'a');self.notion.timeout_after_create=True
        self.assertEqual(self.p.sync()['errors'],1)
        self.assertEqual(self.p.sync()['synced'],1);self.assertEqual(len(self.notion.pages),1)
    def test_uncertain_create_never_repeated(self):
        self.p.ingest(JOB,'a');self.notion.fail=True;self.p.sync();self.notion.fail=False
        self.assertEqual(self.p.sync()['errors'],1);self.assertEqual(len(self.notion.pages),0)
    def test_no_credentials_not_success(self):
        self.p.ingest(JOB,'a');self.p.notion=None
        self.assertEqual(self.p.sync()['status'],'Notion 연결 필요')
    def test_schedule_input_spool(self):
        folder=Path(self.tmp.name)/'inbox';folder.mkdir()
        self.assertEqual(self.p.collect_inbox(folder)['status'],'입력 준비 필요')
        (folder/'sample.json').write_text(json.dumps({'request_id':'a','job':JOB}))
        r=self.p.collect_inbox(folder);self.assertEqual(r['accepted'],1);self.assertEqual(r['automatic_sources_enabled'],0)
    def test_workflow_static(self):
        for path in (Path(__file__).resolve().parents[1]/'workflows').glob('*.json'):
            d=json.loads(path.read_text());names={n['name'] for n in d['nodes']}
            self.assertFalse(d['active']);self.assertEqual(d['settings']['timezone'],'Asia/Seoul')
            for targets in d['connections'].values():
                for row in targets['main']:
                    for edge in row:self.assertIn(edge['node'],names)

if __name__=='__main__': unittest.main(verbosity=2)

class NotionContractTests(unittest.TestCase):
    def test_create_update_preserve_user_decision(self):
        from pipeline import Notion
        class Capture(Notion):
            def __init__(self):super().__init__('not-a-real-token','test-data-source');self.calls=[]
            def request(self,method,path,body):self.calls.append((method,path,body));return {'id':'page'}
        n=Capture();d=normalize(JOB)
        n.write('candidate',d)
        create=n.calls[-1][2]
        self.assertEqual(create['parent']['data_source_id'],'test-data-source')
        self.assertEqual(create['properties']['사용자상태']['select']['name'],'검토대기')
        n.write('candidate',d,'page')
        update=n.calls[-1][2]
        self.assertNotIn('사용자상태',update['properties'])
        self.assertIn('원문스냅샷',update['properties'])

class ApiTests(unittest.TestCase):
    def test_auth_validation_and_persistent_intake(self):
        import threading
        from http.server import HTTPServer
        from urllib.request import Request,urlopen
        from urllib.error import HTTPError
        from pipeline import Handler
        with tempfile.TemporaryDirectory() as folder:
            p=Pipeline(str(Path(folder)/'api.sqlite'))
            class TestHandler(Handler):pass
            TestHandler.pipeline=p;TestHandler.api_key='test-key';TestHandler.inbox=folder
            server=HTTPServer(('127.0.0.1',0),TestHandler)
            t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
            url=f'http://127.0.0.1:{server.server_port}/intake'
            body=json.dumps({'request_id':'api-a','job':JOB}).encode()
            try:
                with self.assertRaises(HTTPError) as err:urlopen(Request(url,data=body))
                self.assertEqual(err.exception.code,401)
                with urlopen(Request(url,data=body,headers={'X-Pipeline-Key':'test-key'})) as r:
                    self.assertEqual(json.load(r)['result'],'신규')
                with self.assertRaises(HTTPError) as err:
                    urlopen(Request(url,data=b'{}',headers={'X-Pipeline-Key':'test-key'}))
                self.assertEqual(err.exception.code,400)
                self.assertEqual(p.db.execute('SELECT COUNT(*) FROM candidates').fetchone()[0],1)
            finally:server.shutdown();server.server_close();t.join();p.db.close()
