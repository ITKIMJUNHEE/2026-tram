# frontend

대전 트램 AI 시뮬레이션의 웹 UI입니다. 순수 프레젠테이션 계층으로, 예산·혼잡도·민원 위험 등
모든 연산은 [backend](../backend)가 수행하고 이 앱은 REST API 호출과 시각화만 담당합니다.

## 스택

- **React 19** (Create React App / `react-scripts`)
- **React Router** — 페이지 라우팅
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

## 주요 컴포넌트 구조

```
src/
├── App.js                  라우터 정의 (/, /dashboard, /simulation, /prediction)
├── LoginPage.jsx            로그인 화면 (ID: admin)
├── MainDashboard.jsx        대시보드 진입 화면
├── api/
│   └── client.js            backend REST API 호출 래퍼
└── components/
    ├── SplashScreen.jsx      앱 최초 진입 시 스플래시 화면
    ├── TramMap.jsx           Leaflet 기반 정거장 지도
    ├── TramSimulation.jsx    정책 시뮬레이터 UI (예산/혼잡도/민원 조정)
    └── TramPredictionMap.jsx 월별/시간대별 혼잡도 예측 지도
```

## 참고

- 날씨 표시는 `backend`의 `/api/weather`를 통해 받아오며, backend에 API 키가 없으면
  안전 기본값(4°C, 흐림)으로 대체됩니다.
- 정거장 좌표·데이터는 프론트엔드에 하드코딩돼 있지 않고 전부 `/api/stations`로 조회합니다.
