# docs/screenshots

루트 README에서 쓰는 스크린샷 원본입니다. `scripts/capture-screenshots.js`(Playwright)로
실제 배포된 서비스를 헤드리스 브라우저로 캡처해서 만들었습니다 — 목업이 아니라
`https://oasis-tram.duckdns.org` 및 ArgoCD/Grafana 실제 화면입니다.

| 파일 | 화면 | 인증 |
|---|---|---|
| `dashboard.png` | 시민용 관제 지도 (`/dashboard`) | 불필요 |
| `login.png` | 로그인 화면 (`/`) | 불필요 |
| `admin.png` | 관리자 대시보드 (`/admin`) | 필요 |
| `simulation.png` | 정책 시뮬레이터 (`/simulation`) | 필요 |
| `prediction.png` | 혼잡도 예측 지도 (`/prediction`) | 필요 |
| `argocd.png` | ArgoCD 로그인 화면 | - |
| `grafana.png` | Grafana 로그인 화면 | - |

## 재실행 방법 (화면이 바뀌면 다시 찍기)

Playwright는 npm으로 설치하지 않고, 브라우저가 이미 들어있는 공식 Docker 이미지로
실행합니다 (버전을 서로 맞춰야 하니 `scripts/package.json`의 playwright 버전과
아래 이미지 태그의 버전이 항상 같아야 합니다).

```bash
# 1. 관리자 초기 비밀번호를 k8s Secret에서 가져온다 (하드코딩 금지)
ADMIN_PW=$(kubectl get secret server-secrets -n tram \
  -o jsonpath='{.data.ADMIN_INITIAL_PASSWORD}' | base64 -d)

# 2. Playwright 공식 이미지로 캡처 스크립트 실행 (버전은 scripts/package.json과 일치시킬 것)
docker run --rm \
  -v "$(pwd)":/repo \
  -w /repo/scripts \
  -e ADMIN_PASSWORD="$ADMIN_PW" \
  mcr.microsoft.com/playwright:v1.62.0-noble \
  sh -c "npm install --no-audit --no-fund && node capture-screenshots.js"
```

- 도메인이 다르면 `SITE_BASE_URL`, `ARGOCD_URL`, `GRAFANA_URL` 환경변수로 덮어쓸 수 있습니다.
- 뷰포트는 1280x800 고정입니다.
- 앱의 스플래시 오버레이(`SplashScreen.tsx`, 진입 후 약 3초간 표시)가 다 사라진 뒤 캡처하도록
  각 페이지 진입 후 4초 이상 대기합니다 — 화면이 무거워지면 `SPLASH_CLEAR_MS` 값을 늘리세요.
- Docker 이미지 태그(`mcr.microsoft.com/playwright:vX.Y.Z-noble`)와 `scripts/package.json`의
  `playwright` 버전이 다르면 "Please update docker image" 에러가 납니다 — 둘 다 같이 올리세요.
