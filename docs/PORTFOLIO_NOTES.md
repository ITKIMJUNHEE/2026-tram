# 포트폴리오 / 면접 참고 노트

이 문서는 레포 외부에 공개하는 문서가 아니라, 면접·포트폴리오 설명용으로
프로젝트의 배경·의사결정·트러블슈팅을 정리한 개인 참고 노트. 모든 내용은
`git log`, 각 디렉토리 README, 실제 코드를 근거로 작성했고 지어낸 내용은 없음.

## 1. 한 줄 요약 + 배경

**한 줄 요약**: 대전 트램 정책 시뮬레이터 — 해커톤에서 만든 프론트엔드 프로토타입을
대회 종료 후 React+Express+PostgreSQL 풀스택, JWT 인증 관제 시스템, Python ML
수요 예측, k3s+ArgoCD GitOps 배포, Prometheus+Grafana 모니터링까지 갖춘 서비스로
확장한 프로젝트.

**배경**: 팀 해커톤에서 정적 HTML/JS 프로토타입 제작 (정거장 좌표·시뮬레이션
로직이 전부 프론트엔드에 하드코딩된 프론트엔드 구현 중심의 대회 제출물).
대회 종료 후 이 프로토타입을 실제 서비스 가능한 형태로 확장하기로 결정, 이어서
React+Express 3-Tier 구조 마이그레이션을 시작으로 PostgreSQL 영속화 →
Docker/k3s 배포 → ArgoCD GitOps → TypeScript 전환 → Python ML 예측 서비스 →
JWT 인증 관제 시스템까지 인프라·백엔드·ML·인증 전 영역을 순차적으로 구축.
프론트엔드 프로토타입이 팀 산출물이었다는 사실과, 이후 확장 전체가 개인 작업으로
이어졌다는 사실 둘 다 여기 명확히 남겨둠.

## 2. 개발 타임라인 (커밋 기준)

`git log --reverse --oneline` 전체를 기준으로 함. `chore: update image tags
... [skip ci]`처럼 ArgoCD 매니페스트 자동 커밋(사람이 작성한 게 아니라 CI가
이미지 태그를 sed로 치환해 자동 생성)은 의사결정 단위가 아니라서 타임라인에서
제외.

| 날짜 | 커밋 | 단계 | 무엇을, 왜 |
|---|---|---|---|
| 2025-12-11 ~ 12-16 | `735f13a`~`d47341f` (9커밋, 전부 메시지 `oasis`) | 해커톤 프로토타입 | 팀 해커톤 기간. 정적 HTML/JS로 UI/시각화에 집중, 정거장 좌표·시뮬레이션 로직은 프론트엔드에 하드코딩. 이 시기 커밋 중 하나(`85fbcec`)에 OpenWeatherMap API 키가 평문으로 들어간 게 나중에 발견됨 (트러블슈팅 5번 참고) |
| 2026-07-19 | `661af89` | 소스 정리 | 대회 종료 후 이어받은 프로토타입 소스를 정상 업로드/정리 |
| 2026-07-19 | `5d09e8d` | DB 마이그레이션 | `node:sqlite` → PostgreSQL. 컨테이너 재시작 시 파일 기반 DB 유실, 다중 인스턴스 확장 불가 문제 해결 목적. 동기 API → 비동기 Promise API로 전체 라우터 리팩터링 동반 |
| 2026-07-19 | `20752a9` | 컨테이너화 | client/server/postgres를 Docker Compose로 통합, 로컬 개발 재현성 확보 |
| 2026-07-21 | `5ce9abe` | k3s 배포 전환 | EC2 단일 인스턴스에 k3s 단일 노드 클러스터 구성, Traefik Ingress로 도메인 라우팅. docker-compose는 로컬 개발용으로 남겨둠 |
| 2026-07-21 | `8a81efc` | HTTPS 자동화 | cert-manager + Let's Encrypt `ClusterIssuer`로 인증서 자동 발급/갱신 |
| 2026-07-21 | `267c913` | CI 구축 | GitHub Actions로 server/client 이미지 빌드 후 GHCR 자동 푸시 |
| 2026-07-23 | `1fd05e6` | GitOps 구성 | ArgoCD Application(`tram-app`) 추가, CI가 매니페스트 이미지 태그를 자동 커밋하는 단계 신설 — GitHub Actions(빌드/이미지 커밋)와 ArgoCD(감시/동기화)의 역할 분리 시작 |
| 2026-07-23 | `3d93e8b` | 버그 수정 | 이미지 태그 치환 정규식이 로컬 개발용 이미지 표기를 못 잡던 문제 수정 (트러블슈팅 1번) |
| 2026-07-23 | `178d0fe` | 버그 수정 | `docker/metadata-action`의 `sha-` prefix 미반영으로 인한 `ImagePullBackOff` 수정 (트러블슈팅 1번) |
| 2026-07-23 | `fd6b3ed` | 모니터링 | `kube-prometheus-stack` 설치, backend에 `prom-client` 메트릭 노출 |
| 2026-07-23 | `e1a54f0` | 구조 재정리 | server/client → backend/frontend, k8s 리소스 → infra/ 하위로 통합. ml-service/, infra/terraform/ 자리 미리 확보 |
| 2026-07-23 | `7e8f426` | TypeScript 전환 (backend 먼저) | 로직 변경 없이 타입만 추가, API 응답 byte-for-byte 동일성 검증까지 완료 |
| 2026-07-23 | `bc3fe65` | TypeScript 전환 (frontend) | 전환 중 backend의 `simulation_logs` 타입 오류 발견/수정 (트러블슈팅 4번) |
| 2026-07-23 | `c3e5f09` | ML 마이크로서비스 | FastAPI+scikit-learn 승객 수요 예측 서비스 신규 구축, 합성 데이터 5,400건 학습(MAE 226.7, R² 0.985), backend에 실패 시 규칙기반 폴백 프록시 라우트 추가 |
| 2026-07-27 | `749d962` | JWT 인증 도입 | `admins` 테이블 + bcrypt 해싱 + `POST /api/auth/login`(24시간 만료 JWT). 이 시점엔 아직 어떤 라우트도 보호하지 않음 |
| 2026-07-27 | `1ec7053` | 관리자 대시보드 | 관리자 전용 API를 `requireAuth`로 보호, ML 서비스 장애 시 부분 실패 허용(전체 페이지는 안 죽게) |
| 2026-07-27 | `c6119b6` | 날씨 API 실연동 | 더미 날씨 → OpenWeatherMap 실제 API, 10분 캐시, 실패 시 폴백 |
| 2026-07-28 | `7020a2c` | 인증 경계 확정 | 시뮬레이션/예측/로그/시나리오 API 전부 `requireAuth`로 보호, `/api/health`·`/api/stations`·`/api/weather`만 공개 유지. frontend에 `RequireAuth` 가드 추가 |
| 2026-07-28 | `9ac3cb7`, `203303b` | 문서화 | README 체계 정리, 실제 배포 화면 스크린샷 교체 |
| 2026-07-28 | `a3de290` | IaC | 실제 운영 중인 EC2/보안그룹/EIP를 Terraform으로 코드화 (import는 하지 않고 코드 작성·검증까지만) |
| 2026-07-28 | `88b9f54`, `41397a9`, `7b05809` | 아키텍처 다이어그램 | Python `diagrams` 라이브러리로 아이콘 포함 다이어그램 제작, 문서 삽입, 가로 비율 개선 |
| 2026-07-28 | `8da646f` | 버그 수정 (1차) | 로그인 후 원래 가려던 페이지로 복귀하도록 `RequireAuth`/`LoginPage`에 `location.state` 도입 |
| 2026-07-29 | `f72af6f` | 버그 수정 (근본 원인) | 위 수정이 실제로는 대시보드 버튼 클릭 경로에서 재현됨을 확인 — 버튼이 `RequireAuth`를 거치지 않고 있던 게 진짜 원인이었음 (트러블슈팅 3번) |
| 2026-07-29 | `1d2ae6d` | 보안 정리 | PostgreSQL 비밀번호를 매니페스트 평문에서 k8s Secret 참조로 이동 |
| 2026-07-29 | `4e2f940` | 문서 정리 | README/아키텍처/요구사항 문서 문체 통일, 배경 스토리 재작성, 낡은 요구사항 상태 갱신 |

## 3. 기술적 의사결정 Q&A

**Q. 왜 SQLite에서 PostgreSQL로 옮겼나?**
`node:sqlite` 내장 모듈로 시작했으나 컨테이너 재시작 시 파일 기반 DB가 유실되고
다중 인스턴스로 확장할 수 없다는 문제가 있어 PostgreSQL로 전환(`5d09e8d`). 전환
과정에서 SQLite의 동기 호출(`db.prepare().all()`/`.run()`)을 PostgreSQL의 Promise
기반 비동기 `pool.query()`로 바꾸면서 전체 라우터 핸들러를 `async`로 리팩터링,
위치 플레이스홀더(`?` → `$1, $2...`)와 JSONB 자동 파싱 처리도 함께 정리.

**Q. 왜 k3s를 선택했나 (풀 쿠버네티스 대신)?**
인프라가 EC2 단일 인스턴스 하나뿐이라 관리형 EKS나 멀티 노드 `kubeadm` 클러스터를
쓸 트래픽 규모/예산이 아니었음. 컨트롤플레인까지 포함해 단일 바이너리로 가볍게
뜨는 k3s가 이 조건에 적합했음. 실제로 이 인스턴스는 k3s+ArgoCD+Prometheus/Grafana를
동시에 띄운 상태에서 메모리 여유가 빠듯해 2GB 스왑을 추가해야 했을 정도라(infra
트러블슈팅 2번), 풀 스펙 쿠버네티스의 컨트롤플레인 오버헤드까지는 감당하기 어려운
환경이었음.

**Q. ArgoCD와 GitHub Actions 역할을 어떻게 나눴나?**
GitHub Actions는 "빌드 CI" 담당 — push 시 이미지를 빌드해 GHCR에 푸시하고,
k8s 매니페스트의 이미지 태그를 치환해 커밋(`[skip ci]`)하는 것까지만 수행. ArgoCD는
"배포 CD" 담당 — `infra/k8s` 경로를 감시하다 그 커밋을 감지하면 `prune`+`selfHeal`로
클러스터에 자동 동기화. "이미지를 만드는 것"과 "클러스터에 반영하는 것"을 커밋
경계로 분리한 전형적 GitOps 구조. 이 태그 치환 로직에서 실제로 버그 2건이 발생
(트러블슈팅 1번).

**Q. TypeScript 전환은 왜, 어떤 순서로 했나?**
backend 먼저(`7e8f426`) → frontend 나중(`bc3fe65`). 로직 변경 없이 타입만
추가한다는 원칙을 세우고, API 응답 byte-for-byte 동일성까지 검증. backend를
먼저 전환하며 `simulation_logs` 컬럼을 구조화된 JSON 객체로 오추정했는데,
frontend 전환 시 실제 호출부(`TramSimulation.tsx`)를 보고 나서야 실제로는
사람이 읽는 요약 문자열이라는 게 드러나 바로잡음. 백엔드를 먼저 전환한 덕에
프론트엔드 전환 시점에 실사용 코드로 교차검증할 기회가 생겼음.

**Q. ML 서비스를 왜 별도 마이크로서비스로 분리했나?**
scikit-learn 등 Python 생태계가 필요해 Node.js backend와 언어 자체가 다르고,
학습 파이프라인(합성 데이터 생성 → 학습 → `model.pkl` 저장)과 서빙 로직을
분리해두면 재학습이 backend 배포에 영향을 주지 않고 독립적으로 가능. backend는
`/api/predict/ml`에서 이 서비스를 프록시 호출하고, 응답이 없거나 에러가 나면
조용히 규칙 기반 `predictionEngine`으로 폴백 — ML을 "있으면 더 좋은" 부가 기능으로
설계해 장애를 격리.

**Q. JWT 인증은 어떻게 구현했고 왜 이 방식을 택했나?**
`admins` 테이블 + bcrypt 해싱(비밀번호 원문 미저장) + `POST /api/auth/login`에서
24시간 만료 JWT 발급. 아이디가 없는 경우와 비밀번호가 틀린 경우를 구분하지 않고
동일한 에러 메시지를 반환해 계정 존재 여부 자체가 노출되지 않게 함. `requireAuth`
미들웨어가 `Authorization: Bearer` 헤더를 검증해 관제 전용 API(시뮬레이션/예측/
로그/시나리오/관리자)를 보호하고, 시민 공개 API(`health`/`stations`/`weather`)는
인증 없이 열어둠. 세션 스토어 없이 무상태(stateless)로 동작하는 구조를 원해서
세션 기반이 아닌 토큰 기반을 선택.

**Q. 지금 아키텍처의 한계나 개선하고 싶은 부분은?**
- 단일 EC2·단일 AZ·단일 k3s 노드 구조라 이 인스턴스가 죽으면 서비스 전체가
  죽음 (이중화 없음, `docs/architecture.md`에도 명시된 트레이드오프)
- 자동화된 테스트가 사실상 없음 — backend는 테스트 스크립트/파일 자체가 없고,
  frontend는 CRA 기본 템플릿 테스트(`App.test.tsx`, 지금 화면과 무관한 "learn
  react" 텍스트를 찾는 테스트라 사실상 죽은 테스트)만 존재
- 매니페스트에 `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_NAME` 등은 평문으로 남아있음
  (비밀번호만 Secret으로 옮김 — 민감도가 낮다고 판단해 남겨둔 것이라 재검토 여지 있음)
- Terraform은 코드 작성·검증(`init`/`validate`)까지만 하고 실제 리소스를
  `import`하지 않은 상태 (신중하게 별도 진행 예정)
- `backend/package.json`이 `typescript ^7.0.2`로 고정되어 있는데 `ts-node@10.9.2`와
  호환이 깨져 `npm run dev`/`npm run seed`가 fresh install 시 실행되지 않는 이슈를
  최근 발견 (`tsc` 빌드 산출물로 우회 중, 근본 해결은 아직 안 함)

## 4. 트러블슈팅 하이라이트

### ① GitOps 이미지 태그 치환 버그 2건 → `ImagePullBackOff`
- **문제**: ArgoCD가 동기화한 파드가 `ImagePullBackOff`로 뜨지 않음.
- **원인 진단**: 1차로 확인해보니 매니페스트 치환용 `sed` 정규식이 `ghcr.io/...`
  형식만 매칭해서 로컬 개발용 이미지 표기(`image: 2026-tram-server:latest`)를
  치환하지 못하고 있었음(`3d93e8b`). 이를 수정한 뒤 실제 CI 결과를 다시 보니,
  `docker/metadata-action`의 `type=sha` 기본 prefix가 `sha-`라서 GHCR에 실제로
  푸시되는 태그는 `sha-<short-sha>` 형태인데, 치환 로직은 prefix 없이 넣고 있어
  존재하지 않는 태그를 가리키고 있었음(`178d0fe`).
- **해결**: 정규식을 이미지명 뒤 태그 유무와 무관하게 매칭하도록 수정하고,
  치환 로직에 `sha-` prefix를 반영.
- **배운 점**: GitOps 자동화(sed 치환)가 한 번 성공했다고 끝이 아니라, CI 도구가
  실제로 만들어내는 태그 포맷을 명시적으로 확인해야 한다. "동작하는 것처럼 보이는"
  자동화가 조용히 실패할 수 있다.

### ② Grafana readiness probe 실패 (메모리 제한)
- **문제**: `kube-prometheus-stack` 설치 직후 Grafana 컨테이너가 계속
  `Unhealthy`(503).
- **원인 진단**: 처음엔 공인 도메인에 TLS 인증서가 발급되자마자 Certificate
  Transparency 로그를 모니터링하는 자동 스캐너가 `/wp-config.php`, `/.env` 등을
  스캔하는 트래픽을 의심했으나, 이는 공개 도메인에서 흔한 배경 트래픽일 뿐 진짜
  원인이 아니었음. 실제 원인은 Grafana 컨테이너 메모리를 128Mi 요청/256Mi
  제한으로 너무 타이트하게 잡아, 사용량이 한도(약 251Mi)에 붙자 GC 압박으로
  내부 API 서버가 타임아웃 나며 헬스체크가 실패한 것.
- **해결**: `helm upgrade`로 256Mi 요청/768Mi 제한으로 상향.
- **배운 점**: 눈에 띄는 증상(스캔 트래픽)과 실제 원인(메모리 제한)을 혼동하지
  않고, 리소스 사용량 수치를 직접 확인해서 진짜 원인을 좁혀야 한다.

### ③ 로그인 리다이렉트 버그 — "고쳤는데 재현된다"의 진짜 원인
- **문제**: 로그인이 필요한 기능(미래 예측/상세 시뮬레이터) 클릭 후 로그인하면
  원래 페이지가 아니라 항상 `/admin`으로 이동.
- **원인 진단**: 1차 수정에서 `RequireAuth`가 리다이렉트 시 `location.state`로
  원래 경로를 넘기고 `LoginPage`가 이를 읽어 복귀하도록 구현, `/simulation`·
  `/prediction`에 직접 접속하는 시나리오로는 검증을 통과했음(`8da646f`). 하지만
  실사용 진입 경로(대시보드 버튼)로 재현해보니, `MainDashboard.tsx`의 버튼들이
  애초에 `navigate('/')`로 로그인 페이지에 직접 이동하고 있어서 `RequireAuth`를
  아예 거치지 않는 경로였고, 그래서 `location.state`가 실릴 기회 자체가 없었음
  (`f72af6f`).
- **해결**: 버튼의 이동 대상을 실제 보호된 라우트(`/prediction`, `/simulation`)로
  바꿔서 `RequireAuth`를 거치도록 수정.
- **배운 점**: "코드 경로 A"를 고쳤다고 "기능 B"가 반드시 그 경로를 타는 건
  아니다. 재현 시나리오를 실제 진입점(버튼 클릭)까지 그대로 따라가야 진짜 원인을
  잡을 수 있다 — 라우트 직접 접속 테스트만으로는 이 버그를 잡지 못했음.

### ④ TypeScript 전환 중 발견한 데이터 모델 오류
- **문제**: backend를 TypeScript로 먼저 전환하며 `simulation_logs.input_json`/
  `results_json`을 구조화된 `PolicyInputs`/`PolicySimulationResult` 객체로
  타입 지정.
- **원인 진단**: frontend를 나중에 전환하며 실제 호출부(`TramSimulation.tsx`의
  `handleAcceptPolicy`)와 `DecisionLog` 컴포넌트의 렌더링 방식을 보니, 이 두
  컬럼에는 실제로는 `"배차 6분 / 감축 20%"` 같은 사람이 읽는 요약 문자열이
  저장되고 있었음.
- **해결**: 해당 타입들을 `string`으로 정정. 반면 `saved_scenarios`의 동일한
  이름의 컬럼은 실제로 구조화된 객체가 맞아 그대로 유지 — 같은 컬럼명이라도
  테이블마다 실제 쓰임새가 다르다는 것을 확인.
- **배운 점**: 코드만 보고 타입을 추정하지 말고 실제 저장/렌더링 경로(프론트엔드
  사용부)까지 확인해야 한다. 백엔드를 먼저 전환한 전략 덕분에 프론트엔드 전환
  시점에 교차검증할 기회가 자연스럽게 생겼음.

### ⑤ 과거 커밋에 남아있던 API 키 노출 점검
- **문제**: 포트폴리오 공개 전 점검 중 `git log -p` 전체 히스토리에서 초기
  해커톤 커밋(`85fbcec`)에 OpenWeatherMap API 키가 평문으로 하드코딩된 것을
  발견.
- **원인 진단**: 이후 리팩터링 커밋(`661af89`)에서 코드상으로는 환경변수 방식으로
  교체됐지만, git history 자체에는 예전 값이 영구적으로 남아있다는 것을 확인.
  이 키가 지금 운영 중인 키와 같은지 다른지 확인이 필요했음.
- **해결**: 확인 결과 현재 운영 중인 키와는 다른, 이미 비활성화된 별개의 키였음을
  확인해 재발급 등 추가 조치는 필요 없었음.
- **배운 점**: "지금 코드에 없다"는 것과 "git history에 없다"는 건 다르다. 과거
  커밋에 실제 값이 남아있는지는 `git log -p`로 별도 확인해야 하고, 커밋 전에
  API 키/시크릿 하드코딩 여부를 사전 점검하는 습관이 필요하다.

## 5. 앞으로 할 일 (로드맵)

- **Terraform import**: 아직 진행 안 함. `infra/terraform/README.md`에 정리된
  순서(SSH 인바운드 CIDR을 AWS 콘솔/CLI로 먼저 정확히 확인 → 보안그룹·인스턴스·
  EIP를 하나씩 `terraform import` → `plan`으로 diff가 없는지 반드시 확인한
  뒤에만 고려)대로 신중하게 별도 진행 예정. 지금 실제 운영 중인 인스턴스라
  자격증명 실수 시 리스크가 있어 서두르지 않음.
- **개인화 기능(즐겨찾기 등)**: 미착수. 예: 자주 보는 정거장 즐겨찾기, 관제
  담당자별 대시보드 커스터마이즈 등 — 아직 요구사항 정의 단계에도 들어가지 않음.
- **기타 검토 중인 것**:
  - 자동화된 테스트 커버리지 확충 (현재 backend는 테스트 부재, frontend는
    CRA 기본 템플릿 테스트만 존재)
  - `ts-node`/`typescript` 7.x 버전 호환성 문제 근본 해결 (현재는 `tsc` 빌드
    산출물로 우회 중)
  - 매니페스트에 남은 평문 값(비밀번호 외 `DB_HOST`/`DB_PORT`/`DB_USER`/
    `DB_NAME` 등) 정리 필요성 재검토
  - 다중 관리자 계정/역할 기반 권한 분리 (현재는 `admin` 단일 계정)
