# STEP 4 검증 결과

2026-10-06 · 실행: `python -m unittest discover -s step4/tests -v`

**로컬 자동 검증 16개 PASS. 운영 연동 관련 4개 WARNING. FAIL 0개.**
첫 실행에서 장애 복구 테스트가 실패했다. 생성 결과가 불확실한 경우 자동 재생성하면 안 되는 설계에 맞춰 테스트를 조회 장애와 생성 장애로 나눈 후 통과했다. 기능을 완화해 통과시키지 않았다.

| 검증 | 결과 | 범위 |
|---|---|---|
| 신규 후보·검토대기·점수 없음 | PASS | 처리 모듈 |
| 동일 공고 다른 request ID | PASS | 같은 후보 재사용 |
| 같은 request 재시도·내용 충돌 | PASS | 멱등·충돌 거부 |
| 수정공고 새 버전·보류 유지 | PASS | SQLite |
| 지원단위·회차·사이트 차이 | PASS | 별개 후보, 자동 병합 없음 |
| 정보 누락 | PASS | 판단보류·누락 목록 |
| 경력 하한 초과·대체 경로 | PASS | 명시 확인 입력만 필터 |
| 내부주소·비HTTP·URL 인증정보 | PASS | 저장 URL 검증 |
| Notion 조회 장애·재시작·복구 | PASS | 모의 Notion, 지속 큐 |
| Notion 생성 성공 뒤 응답 소실 | PASS | 모의 Notion, 조회 후 기존 페이지 반영 |
| 불확실한 생성 결과 | PASS | 무조건 재생성 차단 |
| Credentials 미설정 | PASS | 완료로 위장하지 않음 |
| 정기 입력함 처리·빈 입력함 | PASS | 파일 입력, 외부 자동수집 0 표시 |
| Workflow 연결·timezone·inactive | PASS | JSON 정적 검사, 실제 import 아님 |
| Notion payload 계약 | PASS | create/update 구분·원문스냅샷·사용자상태 보존 |
| HTTP 입력·인증·검증 | PASS | 실제 로컬 HTTPServer, 401/400/200 확인 |
| n8n import 및 Node 실행 | WARNING | n8n 실행환경 미제공 |
| 실제 Notion API 저장 및 조회 | WARNING | Integration·data source 미설정 |
| 외부 사이트 검색 | WARNING | 자동검색 어댑터 미구현·수집원 미연결 |
| 서울 08/20시 정기 실행 | WARNING | Workflow 미활성 |

사용자 승인 감지·Jobs 승격·AI 평가·기업조사·문항 입력 UI·초안 생성은 이번 테스트 범위 밖이다. 화면 미리보기의 클릭은 실제 저장이 아니다.
