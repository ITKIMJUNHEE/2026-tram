# frontend

대전 트램 AI 시뮬레이션의 웹 UI입니다. 순수 프레젠테이션 계층으로, 예산·혼잡도·민원 위험 등
모든 연산은 [backend](../backend)가 수행하고 이 앱은 REST API 호출과 시각화만 담당합니다.
시민 공개 화면과 관제 담당자 전용 화면(JWT 인증 필요)이 라우트 레벨로 분리되어 있습니다.

## 스택

- **React 19** + **TypeScript** (Create React App / `react-scripts`)
- **React Router** — 페이지 라우팅, 라우트 가드
- **Leaflet** / **react-leaflet** — 정거장 지도 시각화
- **Recharts** — 혼잡도/예측 차트
- **TailwindCSS** — 스타일링
- **lucide-react** — 아이콘

## 로컬 실행

```bash
cd frontend
npm install
npm start   # http://localhost:3000, package.json의 "proxy": "http://localhost:4000"로 /api 요청을 backend에 프록시
```

배포용 빌드(정적 파일 생성)는 `npm run build`. Docker Compose/쿠버네티스 배포 시에는
`Dockerfile`의 멀티스테이지 빌드(`node:20-slim` 빌드 → `nginx:alpine` 서빙)를 사용하며,
`nginx.conf`가 `/api/` 요청을 `server` 서비스(포트 4000)로 프록시합니다.

## 라우트 / 인증 경계

| 경로 | 화면 | 인증 |
|---|---|---|
| `/` | 로그인 | - |
| `/dashboard` | 시민 대시보드 (날씨, 정거장 지도) | 불필요 |
| `/admin` | 관리자 대시보드 | 필요 (컴포넌트 자체에서 토큰 체크 + API 401 감지) |
| `/simulation` | 정책 시뮬레이터 | 필요 (`RequireAuth` 라우트 가드) |
| `/prediction` | 혼잡도 예측 지도 | 필요 (`RequireAuth` 라우트 가드) |

`RequireAuth`는 저장된 토큰이 없거나 JWT의 `exp` 클레임이 지났으면(서버 왕복 없이 클라이언트에서
디코딩) 로그인 페이지로 리다이렉트합니다. `/admin`은 라우트 가드 대신, 컴포넌트 마운트 시
토큰 유무를 확인하고 API 호출이 401을 반환하면 그 시점에 로그아웃 처리하는 방식으로
동일한 목적을 달성합니다 (관리자 대시보드는 부분적으로 실패해도(예: ML 서비스 다운) 나머지
섹션은 살아있어야 해서 전체 페이지 단위 가드보다 세밀한 제어가 필요했습니다).

시민 대시보드(`MainDashboard.tsx`)에는 관제 전용 기능(미래 예측/상세 시뮬레이터) 버튼이
그대로 보이지만, 클릭하면 "🔒 로그인 필요" 배지와 함께 로그인 페이지로 이동합니다 — 기능의
존재는 알리되 접근은 막는 방식입니다.

## 주요 컴포넌트 구조

```
src/
├── App.tsx                   라우터 정의 (/, /admin, /dashboard, /simulation, /prediction)
├── LoginPage.tsx               로그인 화면, 성공 시 /admin으로 이동
├── MainDashboard.tsx           시민 공개 대시보드
├── AdminDashboard.tsx          관리자 대시보드 (통계, ArgoCD/Grafana 링크, ML 모델 정보, 로그/시나리오)
├── api/
│   └── client.ts               backend REST API 호출 래퍼, JWT 토큰 저장/자동 첨부, ApiError(401 감지용)
├── types/api.ts                backend 응답 타입 미러링
└── components/
    ├── SplashScreen.tsx         앱 최초 진입 시 스플래시 화면 (약 3초)
    ├── RequireAuth.tsx          인증 라우트 가드 (/simulation, /prediction에 적용)
    ├── TramMap.tsx              Leaflet 기반 정거장 지도
    ├── TramSimulation.tsx       정책 시뮬레이터 UI (예산/혼잡도/민원 조정)
    ├── TramPredictionMap.tsx    월별/시간대별 혼잡도 예측 지도
    └── DecisionLog.tsx          정책 결정 로그 표시
```

## 참고

- 날씨 표시는 `backend`의 `/api/weather`를 통해 받아오며, backend에 API 키가 없거나 실패하면
  안전 기본값(4°C, 흐림)으로 대체됩니다.
- 정거장 좌표·데이터는 프론트엔드에 하드코딩돼 있지 않고 전부 `/api/stations`로 조회합니다.
- `api/client.ts`의 `authHeaders()`가 토큰이 있을 때 모든 요청에 자동으로
  `Authorization: Bearer <token>`을 붙이므로, 새 API 호출 함수를 추가할 때 별도 처리가 필요 없습니다.

## 트러블슈팅

### TypeScript 전환 후 `react-scripts build`가 `npm ci`에서 실패
`react-scripts@5.0.1`은 `typescript@"^3.2.1 || ^4"`를 peerOptional로 요구하는데, 최신
TypeScript(5.x)를 설치하면 `npm ci`가 peer dependency 충돌로 실패합니다.
`package.json`의 `devDependencies`에 최신 TypeScript를 넣어야 하는 상황이라면
`npm ci --legacy-peer-deps`(`Dockerfile`에도 반영됨)로 우회해야 합니다.

### 스크린샷 캡처 시 스플래시 화면이 찍힘
`SplashScreen.tsx`가 모든 페이지 진입 시 약 3초간 전체 화면을 덮습니다. 헤드리스 브라우저로
스크린샷을 찍을 때 이 시간을 기다리지 않으면 로고 오버레이가 섞여서 찍힙니다
(`docs/screenshots/README.md`의 캡처 스크립트가 페이지 진입 후 4초 이상 대기하는 이유).
