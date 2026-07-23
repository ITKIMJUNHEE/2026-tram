# 요구사항 정의서

기존 대전 트램 시뮬레이션 기능을 코드 기준으로 역정리한 문서입니다.

## 기능 요구사항

| ID | 요구사항 | 설명 | 근거 |
|---|---|---|---|
| FR-01 | 정거장 목록 조회 | 전체 정거장의 좌표·유형(주거/상업 등)·기본 승객 수를 조회한다 | `GET /api/stations`, `backend/src/data/stationMeta.json` |
| FR-02 | 정책 시뮬레이션 | 트램 배차 간격, 버스 감축률, 첨두시 승객 수 등을 입력받아 연간 예산·혼잡도·민원 위험도를 계산한다 | `POST /api/simulate`, `policyEngine.js` |
| FR-03 | 날씨 반영 시뮬레이션 | 비/눈 날씨 시 트램 속도 저하를 배차 효과에 반영한다 | `policyEngine.js`의 `speedFactor` 계산 |
| FR-04 | 최적 대안 탐색 | 배차 간격·버스 감축률 조합을 그리드서치로 탐색해 예산 제약 내 최적 시나리오를 찾는다 | `POST /api/simulate/alternative` |
| FR-05 | 환경 효과 산출 | 시뮬레이션 결과로부터 CO2 절감량, 소나무 환산, 승용차 감소 대수를 계산한다 | `policyEngine.js` |
| FR-06 | 혼잡도 예측 | 월별/시간대별(출근/평시/퇴근) 정거장별 예상 승객 수와 혼잡도를 예측한다 | `POST /api/predict`, `predictionEngine.js` |
| FR-07 | 신호 체계 반영 예측 | 신호 우선순위 레벨, AI 모드 여부를 예측 계산에 반영한다 | `predictionEngine.js` |
| FR-08 | 월별 버스 운행 데이터 조회 | 특정 월의 버스 운행 원본 데이터를 조회한다 | `GET /api/predict/bus-data/:month` |
| FR-09 | 정책 결정 로그 기록/조회 | 시뮬레이션 입력·결과·판단(승인/반려)·의견을 기록하고 이력을 조회한다 | `GET·POST /api/logs` |
| FR-10 | 시나리오 저장/조회 | 특정 입력 조합을 이름 붙여 저장하고 나중에 다시 불러온다 | `GET·POST /api/scenarios` |
| FR-11 | 날씨 조회 | 대전 지역 실시간 날씨(기온/상태)를 조회한다 | `GET /api/weather` |
| FR-12 | 지도 시각화 | 정거장 위치와 혼잡도를 지도 위에 표시한다 | `TramMap.jsx`, `TramPredictionMap.jsx` (Leaflet) |
| FR-13 | 로그인 진입 | 대시보드 진입 전 로그인 화면을 거친다 | `LoginPage.jsx` |

## 비기능 요구사항

| ID | 요구사항 | 설명 | 현재 상태 |
|---|---|---|---|
| NFR-01 | 컨테이너화 | frontend/backend/postgres를 각각 독립 컨테이너로 배포 가능해야 한다 | ✅ Docker Compose, 쿠버네티스 매니페스트 |
| NFR-02 | 무중단 배포 | 코드 변경이 push만으로 자동 빌드·배포되어야 한다 | ✅ GitHub Actions + ArgoCD GitOps |
| NFR-03 | HTTPS | 공인 도메인에 대해 유효한 TLS 인증서로 서비스되어야 한다 | ✅ cert-manager + Let's Encrypt |
| NFR-04 | 관측 가능성 | 서비스 리소스 사용량과 요청 지표를 모니터링할 수 있어야 한다 | ✅ Prometheus + Grafana, backend `/api/metrics` |
| NFR-05 | 데이터 영속성 | 정책 로그·시나리오·정거장 데이터가 재배포 후에도 유지되어야 한다 | ✅ PostgreSQL (SQLite에서 마이그레이션 완료) |
| NFR-06 | 인증/보안 | 실제 사용자 인증(비밀번호 검증, 세션/토큰) | ⚠️ **미구현** — 현재 로그인은 ID `admin` 문자열만 확인하는 테스트용 스텁이며 비밀번호를 검증하지 않음 |
| NFR-07 | 확장성 | 머신러닝 기반 예측으로 고도화 가능해야 한다 | 🔜 계획 단계 (`ml-service/`, 아직 미구현) |
| NFR-08 | 인프라 코드화 | 서버 인프라를 코드로 재현 가능해야 한다 | 🔜 계획 단계 (`infra/terraform/`, 아직 미구현) |

> NFR-06은 현재 알려진 한계이며, 실사용 배포 전 반드시 실제 인증 로직으로 교체가 필요합니다.
