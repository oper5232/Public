"""STEP 4 candidate intake. No approval, Jobs, AI, or cover-letter execution."""
import datetime as dt
import hashlib
import hmac
import ipaddress
import json
import os
from pathlib import Path
import re
import sqlite3
import threading
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError

LOCK = threading.RLock()
VERSION = 'step4-1.0'

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def normalize(raw):
    if not isinstance(raw, dict):
        raise ValueError('공고는 JSON 객체여야 합니다')
    url = raw.get('url', '')
    if not isinstance(url, str):
        raise ValueError('url 형식 오류')
    u = urlsplit(url)
    if u.scheme not in ('https', 'http') or not u.hostname or u.username or u.password:
        raise ValueError('공개 공고 URL 필요')
    host = u.hostname.lower()
    if host == 'localhost' or host.endswith(('.local', '.internal')):
        raise ValueError('로컬 URL 불가')
    try:
        if not ipaddress.ip_address(host).is_global:
            raise ValueError('내부 주소 불가')
    except ValueError as exc:
        if str(exc) == '내부 주소 불가':
            raise
    # No speculative query stripping: recruiting identifiers remain intact.
    canonical = urlunsplit((u.scheme.lower(), u.netloc.lower(), u.path or '/', u.query, ''))
    out = {'url': url, 'canonical_url': canonical}
    for f in ('title', 'company', 'duties', 'requirements', 'employment', 'location', 'source', 'unit', 'external_id', 'round'):
        v = raw.get(f)
        if v is not None and (not isinstance(v, str) or len(v) > 30000):
            raise ValueError(f'{f} 값/길이 오류')
        out[f] = v.strip() if isinstance(v, str) else None
    out['title'] = out['title'] or '제목 미확인'
    out['source'] = out['source'] or '사용자입력'
    out['capture_level'] = raw.get('capture_level', '링크만')
    if out['capture_level'] not in ('링크만', '검색요약', '일부본문', '상세본문'):
        raise ValueError('확보 수준 오류')
    for f in ('deadline', 'posted_at'):
        v = raw.get(f)
        if v is not None:
            dt.date.fromisoformat(v)
        out[f] = v
    out['is_synthetic'] = raw.get('is_synthetic', False)
    if type(out['is_synthetic']) is not bool:
        raise ValueError('is_synthetic은 boolean')
    # Evidence-based classification only; titles do not establish eligibility.
    duties = out['duties'] or ''
    related = bool(re.search(r'전기|수변전|변압기|전력설비', duties))
    maintenance = bool(re.search(r'정비|보전|유지보수|운영', duties))
    out['family'] = '전기설비 정비·운영 후보' if related and maintenance else '미분류'
    out['decision'] = '대상' if related and maintenance else '판단보류'
    out['reason'] = '담당업무에 전기설비 및 정비·운영 근거 있음' if out['decision'] == '대상' else '담당업무 근거 부족 또는 혼합 직무'
    # Only an explicitly supplied mandatory numeric condition is used to exclude.
    minimum = raw.get('required_min_years')
    alternative = raw.get('has_entry_or_alternative', None)
    if minimum is not None:
        if isinstance(minimum, bool) or not isinstance(minimum, (int, float)) or minimum < 0:
            raise ValueError('필수 경력 하한 오류')
        if not out['requirements'] or out['capture_level'] != '상세본문':
            minimum = None
        elif minimum > 3 and alternative is False:
            out['decision'], out['reason'] = '대상외', '확인된 필수 경력 하한 3년 초과, 신입·대체 경로 없음'
    out['required_min_years'], out['has_entry_or_alternative'] = minimum, alternative
    out['missing'] = [f for f in ('company', 'duties', 'requirements', 'deadline') if not out[f]]
    identity = host + '|' + (out['external_id'] or canonical) + '|' + (out['unit'] or '지원단위미확인') + '|' + (out['round'] or '')
    out['source_key'] = hashlib.sha256(identity.encode()).hexdigest()
    out['fingerprint'] = hashlib.sha256(json.dumps(out, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    return out

class Notion:
    def __init__(self, token, data_source_id):
        self.token, self.data_source_id = token, data_source_id
    def request(self, method, path, body):
        req = Request('https://api.notion.com/v1/' + path,
            data=json.dumps(body).encode(), method=method,
            headers={'Authorization': 'Bearer ' + self.token, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json'})
        try:
            with urlopen(req, timeout=30) as r:
                return json.load(r)
        except HTTPError as e:
            # Never log response bodies, secrets, or full request URLs.
            raise RuntimeError(f'Notion HTTP {e.code}') from None
    def find(self, candidate_id):
        data = self.request('POST', f'data_sources/{self.data_source_id}/query',
            {'filter': {'property': '후보ID', 'rich_text': {'equals': candidate_id}}, 'page_size': 2})
        return data['results']
    def write(self, candidate_id, data, page_id=None):
        def rich(s):
            s = str(s or '')
            return {'rich_text': [{'text': {'content': s[i:i+1800]}} for i in range(0, len(s), 1800)]}
        props = {'후보명': {'title': [{'text': {'content': data['title'][:1800]}}]},
            '후보ID': rich(candidate_id), '회사': rich(data['company']),
            '원문URL': {'url': data['url']}, '수집판정': {'select': {'name': data['decision']}},
            '확보수준': {'select': {'name': data['capture_level']}},
            '기본직무': rich(data['family']), '누락정보': rich(', '.join(data['missing'])),
            '판정사유': rich(data['reason']),
            '원문스냅샷': rich(json.dumps(data, ensure_ascii=False)),
            '시스템상태': {'select': {'name': '사용자검토'}},
            '최종확인': {'date': {'start': now()}},
            '합성테스트': {'checkbox': data['is_synthetic']}}
        if page_id:
            # User decision is never overwritten by rediscovery or retry.
            return self.request('PATCH', 'pages/' + page_id, {'properties': props})
        props['사용자상태'] = {'select': {'name': '검토대기'}}
        payload = {'parent': {'type': 'data_source_id', 'data_source_id': self.data_source_id}, 'properties': props}
        return self.request('POST', 'pages', payload)

class Pipeline:
    def __init__(self, path, notion=None):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.notion = notion
        self.db.executescript('''
          PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS candidates(id TEXT PRIMARY KEY, source_key TEXT UNIQUE,
            data TEXT, version INTEGER, state TEXT, user_state TEXT, page_id TEXT,
            dirty INTEGER, create_attempted INTEGER DEFAULT 0, error TEXT);
          CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, candidate_id TEXT, stage TEXT,
            result TEXT, at TEXT, version INTEGER);
          CREATE TABLE IF NOT EXISTS intake(request_id TEXT PRIMARY KEY, fingerprint TEXT, response TEXT);
          CREATE TABLE IF NOT EXISTS versions(candidate_id TEXT, version INTEGER, data TEXT,
            PRIMARY KEY(candidate_id,version));
        ''')
        self.db.commit()
    def event(self, cid, stage, result, version):
        self.db.execute('INSERT INTO events VALUES(?,?,?,?,?,?)', (str(uuid.uuid4()), cid, stage, result, now(), version))
    def ingest(self, raw, request_id):
        if not isinstance(request_id, str) or not request_id.strip() or len(request_id) > 200:
            raise ValueError('request_id 필요')
        data = normalize(raw)
        encoded = json.dumps(data, ensure_ascii=False, sort_keys=True)
        with LOCK, self.db:
            old = self.db.execute('SELECT * FROM intake WHERE request_id=?', (request_id,)).fetchone()
            if old:
                if old['fingerprint'] != data['fingerprint']:
                    raise ValueError('같은 request_id에 다른 입력 사용 불가')
                return json.loads(old['response'])
            row = self.db.execute('SELECT * FROM candidates WHERE source_key=?', (data['source_key'],)).fetchone()
            if row:
                cid, ver = row['id'], row['version']
                if json.loads(row['data'])['fingerprint'] == data['fingerprint']:
                    result = '동일공고'
                else:
                    ver += 1
                    self.db.execute('UPDATE candidates SET data=?,version=?,dirty=1 WHERE id=?', (encoded, ver, cid))
                    self.db.execute('INSERT INTO versions VALUES(?,?,?)', (cid, ver, encoded))
                    result = '새버전'
            else:
                cid, ver, result = str(uuid.uuid4()), 1, '신규'
                self.db.execute('INSERT INTO candidates VALUES(?,?,?,?,?,?,?,?,?,?)',
                    (cid, data['source_key'], encoded, ver, '사용자검토', '검토대기', None, 1, 0, None))
                self.db.execute('INSERT INTO versions VALUES(?,?,?)', (cid, ver, encoded))
            self.event(cid, '수집', result, ver)
            response = {'candidate_id': cid, 'version': ver, 'result': result, 'user_state': row['user_state'] if row else '검토대기', 'notion_sync': '별도 동기화 필요'}
            self.db.execute('INSERT INTO intake VALUES(?,?,?)', (request_id, data['fingerprint'], json.dumps(response, ensure_ascii=False)))
            return response
    def sync(self):
        with LOCK:
            rows = self.db.execute('SELECT * FROM candidates WHERE dirty=1').fetchall()
            if not self.notion:
                return {'status': 'Notion 연결 필요', 'pending': len(rows), 'synced': 0}
            success, errors = 0, 0
            for row in rows:
                try:
                    # Query before create also reconciles a timed-out successful create.
                    matches = self.notion.find(row['id'])
                    if len(matches) > 1:
                        raise RuntimeError('동일 후보ID가 Notion에 여러 개 있음: 수동 복구 필요')
                    page_id = matches[0]['id'] if matches else row['page_id']
                    if not page_id and row['create_attempted']:
                        # Notion may be eventually consistent. Never blind retry a create.
                        raise RuntimeError('이전 생성 결과 미확인: Notion 재확인 필요')
                    if not page_id:
                        with self.db:
                            self.db.execute('UPDATE candidates SET create_attempted=1 WHERE id=?', (row['id'],))
                    result = self.notion.write(row['id'], json.loads(row['data']), page_id)
                    with self.db:
                        self.db.execute('UPDATE candidates SET page_id=?,dirty=0,state=?,error=NULL WHERE id=?', (result['id'], '사용자검토', row['id']))
                        self.event(row['id'], 'Notion저장', '성공', row['version'])
                    success += 1
                except Exception:
                    with self.db:
                        self.db.execute('UPDATE candidates SET state=?,error=? WHERE id=?', ('오류', 'Notion 동기화 실패 또는 생성 결과 확인 필요', row['id']))
                        self.event(row['id'], 'Notion저장', '오류', row['version'])
                    errors += 1
            return {'status': '오류' if errors else '완료', 'synced': success, 'errors': errors}
    def collect_inbox(self, folder):
        # Structured input spool only. No external site access is silently enabled.
        folder = Path(folder)
        folder.mkdir(parents=True, exist_ok=True)
        accepted, failed = 0, 0
        for path in sorted(folder.glob('*.json'))[:100]:
            try:
                envelope = json.loads(path.read_text())
                self.ingest(envelope['job'], envelope['request_id'])
                path.rename(path.with_suffix('.processed'))
                accepted += 1
            except Exception:
                path.rename(path.with_suffix('.failed'))
                failed += 1
                with self.db:
                    self.event(None, '수집', '입력오류', None)
        return {'status': '입력오류' if failed else ('수집완료' if accepted else '입력 준비 필요'), 'accepted': accepted, 'failed': failed, 'automatic_sources_enabled': 0}

class Handler(BaseHTTPRequestHandler):
    pipeline = None
    api_key = None
    inbox = None
    def log_message(self, *args):
        pass
    def do_POST(self):
        if not hmac.compare_digest(self.headers.get('X-Pipeline-Key', ''), self.api_key):
            return self.reply(401, {'error': '인증 필요'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 <= size <= 250000:
                return self.reply(413, {'error': '요청 크기 초과'})
            body = json.loads(self.rfile.read(size) or b'{}')
            if self.path == '/intake':
                result = self.pipeline.ingest(body['job'], body['request_id'])
            elif self.path == '/scheduled':
                result = self.pipeline.collect_inbox(self.inbox)
                result['sync'] = self.pipeline.sync()
            elif self.path == '/sync':
                result = self.pipeline.sync()
            else:
                return self.reply(404, {'error': '지원하지 않는 경로'})
            self.reply(200, result)
        except (ValueError, KeyError, TypeError):
            self.reply(400, {'error': '입력 형식 확인 필요'})
        except Exception:
            self.reply(500, {'error': '처리 오류: 실행 로그 확인 필요'})
    def reply(self, status, data):
        encoded = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

if __name__ == '__main__':
    key = os.getenv('PIPELINE_API_KEY', '')
    if len(key) < 32:
        raise SystemExit('PIPELINE_API_KEY는 32자 이상으로 설정해야 합니다')
    token, ds = os.getenv('NOTION_TOKEN'), os.getenv('NOTION_CANDIDATES_DATA_SOURCE_ID')
    Handler.pipeline = Pipeline(os.getenv('PIPELINE_DB', './state/pipeline.sqlite'), Notion(token, ds) if token and ds else None)
    Handler.api_key, Handler.inbox = key, os.getenv('PIPELINE_INBOX', './inbox')
    HTTPServer((os.getenv('PIPELINE_HOST', '127.0.0.1'), int(os.getenv('PIPELINE_PORT', '8787'))), Handler).serve_forever()
