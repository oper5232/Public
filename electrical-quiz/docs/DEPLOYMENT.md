# 공개 배포 완료

- **웹사이트:** https://oper5232.github.io/Public/electrical-quiz/
- **소스:** https://github.com/oper5232/Public/tree/main/electrical-quiz
- **배포 실행:** https://github.com/oper5232/Public/actions/runs/39745699201
- 앱 배포 커밋: `49b29b33b4d2575330c729df92e98708a3f1ce63`.
- 실패한 배포 단계만 재실행한 두 번째 실행에서 성공했습니다. Pages는 GitHub Actions 모드입니다.
- HTTPS 공개 주소 HTTP200, HTML·JS·CSS·서비스워커·manifest·아이콘 등7개 파일이 로컬 검증 산출물과 바이트 단위로 일치함을 확인했습니다.
- 공개 주소에서 Chromium 모바일 화면 및 PC 화면으로 문항 표시·10문항 채점·기록 유지·중복 방지·미응시·오답/관심·JSON 이전·오프라인·테마 등9개 브라우저 시나리오를 통과했습니다.

사용자 승인에 따라 `oper5232/Public`의 `electrical-quiz/`에 문제와 소스를 공개했습니다. 기존 main 커밋 `24439436615f60e8a65a28daac7f6cc17a3c47ee`의31개 파일은 경로와 Git blob SHA가 그대로 보존됐고, 새 파일50개도 업로드 직후 원본 SHA와 일치함을 검사했습니다.

## Firebase

프로젝트는 `quiz-8e834`이며 `oper5232.github.io`가 승인 도메인에 등록됐습니다. Google 공급자의 인증 시작 요청은 정상 응답했고, 실제 Firestore 비로그인 읽기·쓰기 요청은 모두403으로 차단됐습니다.

Google 계정 정보 입력·동의·로그인은 자동 검사에서 수행하지 않았습니다. 공개 사이트의 로그인 버튼에서 실제 Google 계정 로그인 화면까지 이동한 것을 확인했습니다. 실제 사용자의 로그인 완료 및 두 실기기 동기화 확인은 별도 결과로 구분해야 합니다. 계정 간 격리와 오프라인 클라우드 큐는 앞서 Auth/Firestore 에뮬레이터에서 검증했습니다.

## 앞으로 수정·배포하기

문항 추가 및 소스 변경은 `electrical-quiz/` 안에서 수행합니다. 기존 ID를 바꾸지 마세요. main에 반영하면 `.github/workflows/electrical-quiz-pages.yml`이 Node.js22에서 설치·검사·빌드를 수행하고, 기존 저장소 파일 경로를 유지한 산출물의 `electrical-quiz/`에 앱을 배포합니다.

서비스워커가 새 버전을 준비하면 앱의 ‘새 버전 적용’ 버튼을 눌러 적용합니다. 브라우저 저장소 삭제 전에 JSON 백업 또는 클라우드 동기화 완료를 확인하세요. 문제 추가·모바일 홈 화면 설치·백업 이전·무료 사용 시 운영 사항은 `README.md`, `SETUP.md`에 있습니다.

## 증거

`test-evidence/github-deployment.json`, `live-deployed-files.json`, `live-browser.json`에서 배포·파일 일치·브라우저 검사 결과를 확인할 수 있습니다. 검증 범위와 미검증 항목은 `TEST-RESULTS.md`를 참조하세요.
