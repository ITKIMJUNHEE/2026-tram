# 요구사항 정의서

기존 대전 트램 시뮬레이션 기능을 코드 기준으로 역정리한 문서.

## 기능 요구사항

| ID | 요구사항 | 설명 | 근거 |
|---|---|---|---|
| FR-01 | 정거장 목록 조회 | 전체 정거장의 좌표·유형(주거/상업 등)·기본 승객 수 조회 | `GET /api/stations`, `backend/src/data/stationMeta.json` |
| FR-02 | 정책 시뮬레이션 | 트램 배차 간격·버스 감축률·첨두시 승객 수 등 입력받아 연간 예산·혼잡도·민원 위험도 계산 | `POST /api/simulate`, `policyEngine.js` |
| FR-03 | 날씨 반영 시뮬레이션 | 비/눈 날씨 시 트램 속도 저하를 배차 효과에 반영 | `policyEngine.js`의 `speedFactor` 계산 |
| FR-04 | 최적 대안 탐색 | 배차 간격·버스 감축률 조합 그리드서치 탐색으로 예산 제약 내 최적 시나리오 도출 | `POST /api/simulate/alternative` |
| FR-05 | 환경 효과 산출 | 시뮬레이션 결과로부터 CO2 절감량·소나무 환산·승용차 감소 대수 계산 | `policyEngine.js` |
| FR-06 | 혼잡도 예측 | 월별/시간대별(출근/평시/퇴근) 정거장별 예상 승객 수 및 혼잡도 예측 | `POST /api/predict`, `predictionEngine.js` |
| FR-07 | 신호 체계 반영 예측 | 신호 우선순위 레벨·AI 모드 여부를 예측 계산에 반영 | `predictionEngine.js` |
| FR-08 | 월별 버스 운행 데이터 조회 | 특정 월의 버스 운행 원본 데이터 조회 | `GET /api/predict/bus-data/:month` |
| FR-09 | 정책 결정 로그 기록/조회 | 시뮬레이션 입력·결과·판단(승인/반려)·의견 기록 및 이력 조회 | `GET·POST /api/logs` |
| FR-10 | 시나리오 저장/조회 | 특정 입력 조합을 이름 붙여 저장, 이후 재호출 | `GET·POST /api/scenarios` |
| FR-11 | 날씨 조회 | 대전 지역 실시간 날씨(기온/상태) 조회 | `GET /api/weather` |
| FR-12 | 지도 시각화 | 정거장 위치와 혼잡도를 지도 위에 표시 | `TramMap.jsx`, `TramPredictionMap.jsx` (Leaflet) |
| FR-13 | 로그인 진입 | 대시보드 진입 전 로그인 화면 경유 | `LoginPage.jsx` |

## 비기능 요구사항

| ID | 요구사항 | 설명 | 현재 상태 |
|---|---|---|---|
| NFR-01 | 컨테이너화 | frontend/backend/postgres 각각 독립 컨테이너로 배포 가능 | ✅ Docker Compose, 쿠버네티스 매니페스트 |
| NFR-02 | 무중단 배포 | 코드 변경 시 push만으로 자동 빌드·배포 | ✅ GitHub Actions + ArgoCD GitOps |
| NFR-03 | HTTPS | 공인 도메인에 유효한 TLS 인증서로 서비스 | ✅ cert-manager + Let's Encrypt |
| NFR-04 | 관측 가능성 | 서비스 리소스 사용량 및 요청 지표 모니터링 가능 | ✅ Prometheus + Grafana, backend `/api/metrics` |
| NFR-05 | 데이터 영속성 | 정책 로그·시나리오·정거장 데이터가 재배포 후에도 유지 | ✅ PostgreSQL (SQLite에서 마이그레이션 완료) |
| NFR-06 | 인증/보안 | 실제 사용자 인증(비밀번호 검증, 세션/토큰) | ✅ JWT 인증 구현 완료 (bcrypt 해싱, 24시간 만료, 관제/시민 영역 API 레벨 분리) |
| NFR-07 | 확장성 | 머신러닝 기반 예측으로 고도화 가능 | ✅ FastAPI+scikit-learn 승객 수요 예측 서비스 구현 완료, 규칙기반 폴백 포함 |
| NFR-08 | 인프라 코드화 | 서버 인프라를 코드로 재현 가능 | ✅ 코드 작성 및 검증(init/validate) 완료, 실제 리소스 import는 별도 진행 예정 |
