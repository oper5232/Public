# 공개 배포

사용자가 `oper5232/Public`의 `electrical-quiz/` 경로에 문제와 소스를 공개하고 사이트를 배포하도록 승인했습니다.

- 소스 위치: https://github.com/oper5232/Public/tree/main/electrical-quiz
- Pages 대상 주소: https://oper5232.github.io/Public/electrical-quiz/
- 위 주소의 실제 공개 성공 여부는 GitHub Actions 및 HTTP 응답 확인 후 기록합니다.
- Firebase 프로젝트: `quiz-8e834`. GitHub Pages 호스트 `oper5232.github.io`가 승인 도메인 목록에 등록된 것을 실제 API에서 확인했습니다.
- 최초 확인 시 저장소의 `has_pages`는 false였고 Pages 및 대상 주소는 HTTP404였습니다. GitHub Settings → Pages → Source를 GitHub Actions로 변경하는 계정 관리 단계가 필요합니다.

기존 main의 커밋 `24439436615f60e8a65a28daac7f6cc17a3c47ee`를 기준으로 31개 기존 파일의 경로와 Git blob SHA를 보존합니다. 새 앱 디렉터리와 루트의 전용 Pages 워크플로만 추가합니다.

워크플로는 Node.js22에서 `npm ci`, 단위 검사, 문항 보존 검사, 빌드를 수행한 뒤 기존 저장소 파일 경로를 유지한 Pages 산출물을 생성합니다. 앱은 산출물의 `electrical-quiz/`에 배치됩니다. 이후 main 반영 때 같은 과정을 자동 실행합니다.

계정 로그인과 Firestore 이용은 사이트 배포 이후 실제 계정·기기에서 추가 검증해야 합니다. 현재까지의 실제 서비스 점검과 에뮬레이터 검사 범위는 `TEST-RESULTS.md`에 구분되어 있습니다.
