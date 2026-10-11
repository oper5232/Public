# 채용 자동화 · JOB HARVEST

STEP4 후보 공고 수집 코드와 승인 공고·자기소개서 입력 웹앱입니다.

## Windows에서 화면 실행

GitHub의 **Code → Download ZIP**으로 받거나 저장소를 clone한 뒤, 압축을 해제한 프로젝트 폴더에서 PowerShell을 엽니다. Python 3.12가 필요하며 추가 패키지 설치는 없습니다.

```powershell
py -3.12 webapp\app.py --demo
```

브라우저 주소창에 `http://127.0.0.1:8000`을 입력하세요. 데모는 합성 데이터만 사용하며 Notion·n8n에 접근하지 않습니다.

실제 Notion 연결과 선택적인 AI 설정은 [웹앱 실행 안내](webapp/README.md)를 참고하세요. 토큰은 로컬 `webapp/.env`에만 입력하고 Git에 올리지 않습니다. 기존 n8n 워크플로는 그대로 유지합니다.

## 테스트

```powershell
py -3.12 -m unittest discover -s webapp/tests -v
py -3.12 -m unittest discover -s step4/tests -v
```

## 구성

- `webapp/`: 승인 목록·상세, 문항별 답변 저장과 작성상태 변경
- 검색 설정: 기업 규모·모집 분야·고용 형태, 포함/제외 키워드, 지역·마감 조건을 저장·전환
- `step4/`: 기존 후보 수집 서비스, n8n 워크플로, 테스트
- `MASTER_SPEC.md`, `DATA_MODEL.md`, `SCORING_SPEC.md`, `COLLECTOR_SPEC.md`: 설계 문서
- 두 HTML 미리보기: 기존 디자인 원본

개발 환경에서 웹앱 테스트 20개, STEP4 테스트 16개, 필터 규칙 테스트 11개가 통과했습니다. 설정은 브라우저에 저장되며 기존 n8n 수집 조건을 변경하지 않습니다. 실제 Notion·AI 연결은 사용자의 로컬 환경 설정 후 확인해야 합니다. 이 서버는 개인 PC의 로컬 실행용입니다.
