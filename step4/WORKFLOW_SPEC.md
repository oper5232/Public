# STEP 4 — 후보 수집 Workflow 구현

버전 1.0 · 2026-10-06 · Asia/Seoul
기준: MASTER_SPEC 1.1 / DATA_MODEL 1.2 / SCORING_SPEC 1.2 및 승인 후 정식 저장이라는 사용자 결정.

## 1. 구현 결과와 경계

이번 산출물은 **n8n 가져오기용 Workflow 2개 + 후보 처리 서비스**다. 실제 n8n 서버에 가져오거나 활성화한 상태는 아니다. Candidates 임시 저장·중복검사·기본 직무 분류·Notion 동기화까지만 구현한다. 승인 후 Jobs 승격·Gate·점수·기업조사·자소서는 후속 Workflow다.

현재 사용 가능한 입력은 사용자가 제공한 링크·본문 JSON 및 같은 형식의 로컬 입력함이다. 사람인·검색 API·기업 공식 사이트를 자동 검색하는 어댑터는 **아직 연결되지 않았다**. 따라서 ‘하루 두 번 외부 사이트 검색이 작동한다’고 표시하지 않는다. 활성 자동 수집원은 0개이고, 입력함이 비어 있으면 ‘입력 준비 필요’로 반환한다.

## 2. Workflow 구조

### 공고 직접 입력

| Node | 역할 |
|---|---|
| 01 공고 직접 입력 · 인증 | POST Webhook, Header Auth로 비공개 입력 |
| 02 입력 검증·정규화·중복·후보 기록 | /intake 호출. 입력 검증·지원단위 식별·동일공고 및 새버전 기록 |
| 03 Notion 후보 동기화·오류 기록 | /sync 호출. 저장 대기 후보의 Notion 반영 |
| 04 접수 결과 반환 · 승인 대기 | 접수 결과와 실제 동기화 결과를 함께 응답 |

### 정기 처리

| Node | 역할 |
|---|---|
| 01 매일 08시·20시 서울 | Cron `0 8,20 * * *`, Workflow timezone=Asia/Seoul |
| 02 입력함 처리·중복검사·후보 동기화 | /scheduled 호출. 최대 100개 JSON 처리 후 Notion 재동기화 |

정기 실행에는 향후 허용된 검색 어댑터가 공급하는 표준 공고를 넣을 수 있다. 현재는 디렉터리 입력만 처리한다. Workflow 파일의 active=false는 의도된 기본값이다. Schedule은 가져오기만으로 가동되지 않으며 실제 활성화/발행과 시간대 검증이 필요하다.

## 3. 실행 모듈 책임

n8n은 예약·인증된 입력·HTTP 호출·실행 이력, Python 모듈은 정규화·중복·분류·지속 기록·Notion 반영을 담당한다. Node 안에 전부 넣지 않고 처리 규칙을 별도 모듈로 두어 테스트 가능하게 했다.

SQLite는 Notion 장애 복구를 위한 운영 저장소다. 사용자 업무 DB는 Candidates이며 SQLite에 Jobs·Career Master·Cover Letter는 없다. 단일 Python 프로세스와 프로세스 내부 직렬 잠금으로 운영한다. 여러 복제본이 같은 DB를 사용하도록 배포하지 않는다. 후보 저장은 transaction, source_key uniqueness, request_id uniqueness로 보호한다.

## 4. Candidates 최소 Notion 속성

기존 변압기 페이지와 분리된 새 채용관리 영역에 Candidates data source를 만든다. 이번 요청에서는 실제 Notion DB를 생성하지 않았다. 아래 이름과 형식을 사용해야 제공된 어댑터와 일치한다.

| 속성 이름 | 형식 | 입력 책임 |
|---|---|---|
| 후보명 | Title | 수집/사용자입력 |
| 후보ID | Rich text | 서비스 불변 UUID |
| 회사 | Rich text | 확보 원문, 없으면 빈 값 |
| 원문URL | URL | 사용자 제공/수집 링크 |
| 수집판정 | Select: 대상/대상외/판단보류 | 근거 기반 필터 |
| 확보수준 | Select: 링크만/검색요약/일부본문/상세본문 | 실제 확보 수준 |
| 기본직무 | Rich text | 직무 후보 또는 미분류 |
| 누락정보 | Rich text | 미확인 항목 |
| 판정사유 | Rich text | 필터 근거 |
| 원문스냅샷 | Rich text | 허용된 입력 JSON, duties/requirements/location/고용형태/마감 포함 |
| 사용자상태 | Select: 검토대기/승인/보류/제외 | 생성 때만 검토대기. 이후 사용자 선택 보존 |
| 시스템상태 | Select: 사용자검토/오류 | 처리 상태 |
| 최종확인 | Date | 동기화 시각 |
| 합성테스트 | Checkbox | 실제 공고와 테스트 데이터 구분 |

현재 대표 스냅샷은 Notion에 반영하고 과거 버전과 이벤트는 SQLite에 남긴다. 승인 후에는 정식 Sources 및 Events로 이관해야 한다. 원문 스냅샷은 AI 요약이 아니다. 테스트 fixture는 합성 데이터이며 실공고로 사용하지 않는다.

## 5. 입력·분류·중복 처리

`fixtures/manual_job.json`이 Webhook 입력 계약이다. request_id는 한 사용자 접수 시도의 불변 ID다. 동일 ID와 동일 내용은 재접수 결과를 재사용하고, 동일 ID의 내용 변경은 400으로 거부한다. 수정 내용을 새 접수하려면 새 request_id를 쓴다.

- 필수: request_id 및 http(s) 공고 URL. 제목·회사·본문·마감이 없으면 미확인/판단보류로 유지한다.
- URL fragment만 비교 키에서 제거한다. 모집 식별자인 query parameter를 임의 제거하지 않는다. URL은 저장용이며 서버가 이를 자동 방문하지 않는다.
- 같은 source host + 외부 ID 또는 canonical URL + 지원단위 + 모집회차는 같은 후보다. 동일 내용이면 새 후보를 생성하지 않고 내용이 바뀌면 버전을 올린다.
- 다른 소스·지원단위·회차는 별개 후보로 유지한다. **사이트 간 동일 모집 확인·유사 후보 그룹 표시는 아직 구현되지 않았다.** 자동 병합하지 않아 잘못된 승인 승계를 방지한다.
- 담당업무에 전기/수변전/변압기/전력설비와 정비/보전/유지보수/운영 근거가 함께 있으면 대상 후보다. 제목만으로 지원 가능 여부를 판정하지 않는다.
- 상세본문과 필수경력 원문이 제공되고, 입력자가 확인한 required_min_years>3 및 has_entry_or_alternative=false면 대상외다. 이는 AI Gate가 아닌 수집 필터이며 사용자를 자동 제외하지 않는다. 필수/우대 경력의 자연어 자동 추출은 구현하지 않았다.
- 링크 입력만으로 본문을 확보했다고 가정하지 않는다. 이미지·PDF OCR은 이번 범위 밖이다.

## 6. Notion 실패·재시도

후보를 SQLite에 먼저 기록한 뒤 Notion에 동기화한다. 인증·타임아웃·서버 장애로 반영이 실패하면 후보 시스템상태=오류, dirty=1, 실패 이벤트를 남긴다. Notion이 끊겨 있으면 해당 Notion 페이지에 즉시 오류를 쓸 수 없으므로 운영 저장소가 오류의 근거다. 다음 예약 또는 /sync 호출에서 복구한다. 미설정 Credentials는 ‘Notion 연결 필요’이며 저장 완료가 아니다.

매 저장 전 후보ID로 Notion을 조회한다. 생성 요청의 성공 응답이 소실되었어도 다음 조회에서 페이지가 보이면 기존 페이지를 갱신한다. 생성 시도 뒤 페이지가 보이지 않는 경우는 불확실한 결과이므로 자동 재생성하지 않는다. 후보ID로 실제 존재 여부를 확인한 후 운영자가 해당 create_attempted 플래그를 복구해야 한다. 플래그를 자동 초기화하지 않는다.

신규 생성 때만 사용자상태=검토대기다. 재발견·재시도 업데이트는 사용자상태를 PATCH하지 않는다. Notion 직접 상태변경의 감지 및 승인 이벤트·Jobs 승격은 후속 단계에서 구현한다.

서비스에 도달하지 못한 n8n HTTP 실패는 n8n 실패 실행 기록으로 남는다. /sync가 HTTP 200을 반환해도 JSON status=오류일 수 있으므로 소비자는 결과 본문을 확인해야 한다. 오류 알림과 별도 Error Workflow는 아직 없다.

## 7. 환경변수·Credentials

| 이름 | 필수 시점 | 용도 |
|---|---|---|
| PIPELINE_API_KEY | 서비스 시작 | 32자 이상 새 비밀값, X-Pipeline-Key 인증 |
| PIPELINE_DB | 기본값 있음 | SQLite 경로, 지속 볼륨 필요 |
| PIPELINE_INBOX | 기본값 있음 | 구조화 JSON 입력 디렉터리 |
| PIPELINE_HOST / PORT | 기본 127.0.0.1 / 8787 | 단독 로컬 실행 설정 |
| NOTION_TOKEN | 실제 Notion 동기화 | Integration token, Candidates 읽기·삽입·수정 권한 |
| NOTION_CANDIDATES_DATA_SOURCE_ID | 실제 Notion 동기화 | database ID와 구분한 data source ID |
| GENERIC_TIMEZONE | n8n 설정 | Asia/Seoul, Workflow에도 명시 |
| N8N_IMAGE / N8N_ENCRYPTION_KEY | 선택 Compose 실행 | 검증할 구체 이미지 tag와 새 encryption key |

n8n Credential 2개:
1. Career Intake Header Auth: 직접 입력 Webhook용. 예: X-Intake-Key 이름과 별도 새 비밀값.
2. Career Pipeline Header Auth: HTTP Request용. 이름 X-Pipeline-Key, 값은 PIPELINE_API_KEY와 동일.

Workflow의 CONFIGURE_* Credential ID는 가져온 뒤 실제 Credential로 선택한다. 파일에 키를 쓰지 않는다. ChatGPT의 Notion 연결만으로 n8n에 Integration token이 전달되는 것은 아니다.

## 8. 실행·검증 절차

1. `.env.example`을 `.env`로 복사해 실행환경 설정을 채운다. 키는 이 문서나 채팅에 넣지 않는다.
2. Python 단독 실행: 환경변수를 설정한 상태에서 `python pipeline.py`. Python 3.12 표준 라이브러리만 사용한다.
3. 선택적인 로컬 Compose: 구체 N8N_IMAGE tag를 지정하고 `docker compose --env-file .env up -d`. 아직 Docker/n8n 실행 검증은 안 했다. n8n 5678, 서비스 8787은 로컬에만 바인딩한다.
4. Workflow JSON 2개를 n8n으로 가져오고 Credentials를 선택한다. Docker 내부에서는 기본 URL `http://pipeline:8787` 사용. 다른 실행환경이면 실제 서비스 주소로 모든 HTTP Node URL을 바꾼다. n8n Cloud는 이 로컬 주소에 접근할 수 없으므로 인증된 HTTPS 서비스가 별도로 필요하다.
5. 먼저 임시 Candidates data source에 합성 fixture로 입력한다. Webhook Test URL에 fixture JSON을 POST하고 Header Auth를 추가한다.
6. 접수 성공과 Notion 성공을 각각 확인한다. 같은 fixture를 두 번 보내도 후보ID가 같고, 사용자상태를 보류로 바꾼 뒤 재수집해도 상태가 유지되어야 한다.
7. 테스트 data source 검증 후에만 실제 후보 DB로 전환한다. 예약을 활성화하고 서울 기준 다음 08/20시 실행 여부를 확인한다.

로컬 모듈 검증: `python -m unittest discover -s tests -v`.

## 9. 다음 단계 입력과 남은 검증

필요한 것은 n8n 실행환경 선택, Candidates data source 생성 및 ID, n8n용 Notion Integration, 두 Header Auth 설정이다. 외부 자동검색을 시작하려면 별도로 승인된 수집원·검색 API 계약/키 및 어댑터 구현이 필요하다.

승인 이후 처리는 다음 단계에서 구현한다. 이 단계는 n8n import·실제 연결·정기 실행이 완료되기 전까지 **코드 구현·로컬 검증 완료, 운영 연동 대기**다.

## 10. 공식 문서 확인

- n8n Schedule Trigger: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/
- Notion data source query: https://developers.notion.com/reference/query-a-data-source
- Notion pages create: https://developers.notion.com/reference/post-page

스케줄 시간대 및 data source query 계약을 공식 문서와 대조했다. Notion API 버전은 2025-09-03을 명시적으로 고정했다. 공식 문서 확인은 실제 연결 테스트를 대신하지 않는다.
