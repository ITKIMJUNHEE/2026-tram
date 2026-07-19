# 대전 트램 AI 시뮬레이션 (Daejeon Tram Policy Simulator)

정거장 좌표·시뮬레이션 로직이 프론트엔드에 하드코딩되어 있던 해커톤 프로젝트를,
**React(client) + Express(server) + PostgreSQL(DB)** 3-Tier 구조로 마이그레이션한 프로젝트입니다.

## 아키텍처

```
client/   React 19 (CRA) — UI, 지도(Leaflet), 입력값 → API 호출만 담당
server/   Express — 정책/예측 시뮬레이션 연산, REST API
server/src/db/  pg(node-postgres) — 정거장/결정로그/저장시나리오 영속화
```

- `client`는 순수 프레젠테이션 계층입니다. 예산·혼잡도·민원 위험 등 모든 연산은
  `server/src/engine/policyEngine.js`(정책 시뮬레이터), `server/src/engine/predictionEngine.js`(예측 지도)에서
  수행하고 REST API로 내려줍니다.
- 정거장 좌표/승객 데이터는 `server/src/data/tram_stations.csv` + `stationMeta.json`을 시드로 PostgreSQL `stations` 테이블에 저장됩니다.
- 정책 승인 로그(`simulation_logs`)와 저장된 시나리오(`saved_scenarios`)도 PostgreSQL에 영속화됩니다.

## 요구사항

- Node.js **18 이상**
- PostgreSQL (로컬 Docker 컨테이너 권장)

## 시작하기

```bash
# 1. 로컬 Postgres 컨테이너 실행 (최초 1회)
docker run -d --name tram-postgres -e POSTGRES_USER=tram -e POSTGRES_PASSWORD=tram -e POSTGRES_DB=tram_db -p 5432:5432 postgres:16

# 2. server/.env 에 DATABASE_URL 설정 (server/.env.example 참고)
#    DATABASE_URL=postgresql://tram:tram@localhost:5432/tram_db

npm run install:all   # client + server 의존성 설치
npm run seed           # PostgreSQL에 정거장 데이터 시딩 (최초 1회, 또는 데이터 갱신 시)
npm run dev             # server(:4000) + client(:3000) 동시 실행
```

브라우저에서 http://localhost:3000 접속 (로그인 ID: `admin`).

날씨 표시 기능(선택)은 `server/.env`에 `OPENWEATHER_API_KEY`를 넣으면 실데이터로 동작하고,
키가 없으면 안전 기본값(4°C, 흐림)으로 대체됩니다. `server/.env.example` 참고.

## 개별 실행

```bash
npm run --prefix server dev    # 백엔드만
npm run --prefix client start  # 프론트엔드만 (proxy로 :4000 API 연동)
```

## 주요 API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/stations` | 전체 정거장 목록 |
| GET | `/api/simulate/defaults` | 정책 시뮬레이터 초기값 (버스 예산은 실데이터 CSV 기준) |
| POST | `/api/simulate` | 정책 시뮬레이션 실행 (예산/혼잡도/민원) |
| POST | `/api/simulate/alternative` | 전체 시나리오 그리드서치로 최적 대안 탐색 |
| POST | `/api/predict` | 월별/시간대별 혼잡도 예측 |
| GET/POST | `/api/logs` | 정책 결정 로그 |
| GET/POST | `/api/scenarios` | 저장된 시나리오 |
| GET | `/api/weather` | 대전 날씨 (서버가 OpenWeatherMap을 프록시) |
