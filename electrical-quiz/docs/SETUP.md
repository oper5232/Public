# 무료 Firebase 및 GitHub Pages 설정

실서비스 Firebase 프로젝트는 사용자 제공 웹 설정의 `quiz-8e834`로 지정했습니다. 사용자 설정 완료 후 Authentication·Google 공급자 응답 및 비로그인 Firestore 읽기·쓰기 차단을 확인했습니다. GitHub Pages 호스트 `oper5232.github.io`가 승인 도메인에 추가된 것을 확인했습니다. 이 설정은 `src/firebase-config.json`과 빌드 결과에 반영됩니다. Google Analytics는 초기화하지 않습니다. 공개 배포 승인을 받았으며 Firebase 프로젝트 관리 권한은 없으므로, 아래 관리 설정 및 실제 배포가 완료되었다는 뜻은 아닙니다.

## Firebase (사용자 계정 접근 필요)

1. https://console.firebase.google.com/ 에서 Google 계정으로 접속합니다.
2. 프로젝트를 생성하고 **Spark 무료 플랜**을 유지합니다. Google Analytics는 이 앱에 필요하지 않습니다. 결제 계정 연결·Blaze 전환은 하지 않습니다.
3. 프로젝트 설정 → 내 앱 → 웹 앱을 등록합니다. Firebase Hosting은 사용하지 않아도 됩니다. 화면에 표시되는 `firebaseConfig` 객체를 복사합니다.
4. `src/firebase-config.json`에 JavaScript 코드가 아닌 아래와 같은 JSON 객체로 저장합니다. 웹 설정값은 공개 클라이언트 식별정보입니다.

```json
{
  "apiKey": "Firebase 웹 설정의 값",
  "authDomain": "프로젝트ID.firebaseapp.com",
  "projectId": "프로젝트ID",
  "storageBucket": "웹 설정의 값",
  "messagingSenderId": "웹 설정의 값",
  "appId": "웹 설정의 값"
}
```

5. Authentication → 시작하기 → 로그인 방법 → **Google 활성화**. 지원 이메일을 지정합니다.
6. Firestore Database → 데이터베이스 생성 → Standard/native 모드 → 적절한 리전(한국 개인 사용이면 서울 `asia-northeast3` 검토) → **프로덕션 모드**를 선택합니다. 테스트 모드의 공개 규칙을 사용하지 않습니다. 리전은 생성 후 변경하기 어렵습니다.
7. Firestore → 규칙에 프로젝트의 `firestore.rules` 전체 내용을 넣고 게시합니다. 또는 관리자 계정으로 인증된 CLI에서 `firebase deploy --only firestore:rules --project 프로젝트ID`를 실행합니다. 이 작업은 웹 설정값만으로는 수행할 수 없습니다.
8. Authentication → 설정 → 승인된 도메인에 실제 Pages 호스트(예: `oper5232.github.io`)를 추가합니다. URL 경로·`https://`는 넣지 않습니다. 로컬 실험에는 `localhost`도 별도 추가합니다.
9. 빌드·배포 후 팝업 Google 로그인, 로그아웃, 계정 전환, 스마트폰 브라우저 인증 유지 여부를 확인합니다. Safari의 추적 방지 등으로 전체 화면 리다이렉트가 제한될 수 있으므로 기본 Google 팝업 로그인을 우선 사용합니다. 앱 내장 브라우저에서 차단되면 Chrome/Safari에서 사이트를 직접 엽니다.

프로젝트 생성·Google 공급자 활성화·규칙 게시에는 계정 권한이 필요합니다. **서비스 계정 개인키, Firebase 관리 SDK 키, 사용자 인증 토큰, OAuth client secret은 저장소·채팅에 넣지 마세요.** OAuth 웹 클라이언트/웹 API key는 공개 앱 식별자로 쓰이지만 API key만으로 사용자 데이터 접근을 허용하지 않으며, 실제 보호는 Auth와 Firestore 규칙이 담당합니다.

## GitHub Pages

공개 범위는 사용자 확인 후 결정합니다. 현재 연결되어 읽을 수 있었던 저장소는 `oper5232/Public`, `oper5232/MR-OLTC-Trainer`이며 이 작업에서는 어느 저장소도 수정하지 않았습니다.

이 프로젝트 전용 저장소를 사용할 경우:

1. GitHub에서 저장소를 만들거나 작업할 저장소를 정합니다. 무료 Pages를 위해 공개 저장소를 쓴다면 문제 데이터와 소스 전체가 공개됩니다. 학습 기록은 저장소에 넣지 않습니다.
2. 프로젝트 루트 내용을 저장소의 루트로 올립니다. `node_modules`, `test-results`, 개인 JSON 백업, 로그·자격 증명은 제외합니다.
3. Settings → Pages → Build and deployment → Source: **GitHub Actions**를 선택합니다.
4. main에 푸시하거나 Actions의 **Verify and deploy GitHub Pages** 워크플로를 실행합니다.
5. 워크플로가 출력한 실제 Pages URL로 접속합니다. 서브경로에서도 상대경로·manifest scope·서비스워커가 동작하도록 구성했습니다.
6. 해당 URL의 호스트를 Firebase 승인 도메인에 넣습니다.

기존 `Public` 저장소 아래 `electrical-quiz/` 폴더로 추가한다면 기존 워크플로·사이트 배포 구조를 먼저 확인하고, 작업 디렉터리와 업로드 경로를 조정해야 합니다. 이 프로젝트의 루트 워크플로로 기존 사이트를 덮어쓰면 안 됩니다. 현재 Pages 설정 변경·사이트 공개는 수행하지 않았습니다.

## 비용 및 유지관리

- 무료 할당량 안에서 쓰며 결제·유료 기능을 자동 활성화하지 않습니다. 현재 무료 할당량은 Firebase 콘솔에서 확인합니다.
- 각 채점에 풀이 이벤트와 시험 체크포인트를 저장하므로 대략 두 번의 문서 쓰기를 사용합니다. 별표·가져오기·시험 시작에도 쓰기가 발생합니다.
- 새 기기의 최초 동기화는 전체 이벤트를 읽습니다. 개인 학습용 규모에서는 단순하지만 장기간 기록이 쌓이면 읽기·저장량이 증가합니다. 계정별 집계·증분 수신·보관 정책이 필요해질 수 있습니다.
- 할당량/네트워크/보안 오류는 상태에 표시하고 로컬 큐를 보존합니다. 재접속·재시도·30초 주기(화면 표시 중)에 재전송합니다. 미동기화 상태에서 사이트 데이터를 삭제하지 마세요.
- 브라우저 로컬 데이터는 서버 인증과 별개입니다. 공용 기기에서는 로그아웃 후 사이트 데이터도 정리하세요. 개인 기기는 정기 JSON 백업을 권장합니다.
- 이벤트는 클라이언트에서 삭제·변경할 수 없도록 규칙을 둡니다. 계정 데이터 영구 삭제가 필요하면 백업·소유자 확인 후 관리 권한으로 별도 수행해야 합니다.
- 다른 기기 시계가 크게 다르면 마지막 학습·복습 순서·관심 상태·최근 시험의 시각 순서가 달라질 수 있습니다. 풀이 이벤트 합산 및 중복 방지는 시계에 의존하지 않습니다.
- 정답이 앱 데이터에 포함되는 개인 학습 도구이며 공인 시험의 부정행위 방지·성적 인증 시스템은 아닙니다.

## 기존 Public 저장소용 배포 구성

배포 전 저장소 트리를 확인했으며 루트 Pages 워크플로와 `electrical-quiz/` 디렉터리는 없었습니다. 사용자 공개 승인을 받아 앱 소스는 `electrical-quiz/`에, 전용 워크플로는 `.github/workflows/electrical-quiz-pages.yml`에 추가하는 구성을 사용합니다.

- 워크플로 템플릿: `deploy/public-repository-pages.yml`.
- 스테이징: `deploy/stage-public-pages.py`. 기존 저장소의 추적 파일 경로를 보존하고 앱의 빌드 결과만 `_site/electrical-quiz/`에 추가합니다. 새 앱의 소스·백업·테스트 디렉터리를 사이트 파일로 복사하지 않습니다.
- 소스와 문제 데이터 자체는 사용자 승인 후 공개 GitHub 저장소에 올라갑니다. 개인 학습 기록은 업로드하지 않습니다.
- GitHub Settings → Pages → Source를 GitHub Actions로 설정해야 합니다. 현재 도구에는 이 관리 설정을 변경하는 기능이 없으며, 배포 진행 상황은 `DEPLOYMENT.md`를 참조하세요.
- 기존 워크플로 `.github/workflows/pages.yml`은 전용 저장소 루트 배포용입니다. Public 저장소에는 위의 별도 워크플로를 사용해야 `/Public/electrical-quiz/` 경로를 유지합니다.
