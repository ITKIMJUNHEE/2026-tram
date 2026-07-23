# backend

대전 트램 AI 시뮬레이션의 API 서버입니다. 정책 시뮬레이션·혼잡도 예측 연산을 수행하고
REST API로 [frontend](../frontend)에 데이터를 내려줍니다.

## 스택

- **Node.js** (>=18) + **Express**
- **PostgreSQL** — [`pg`](https://node-postgres.com/) (node-postgres) 드라이버, 커넥션 풀 방식
- **Prometheus** — [`prom-client`](https://github.com/siimon/prom-client)로 `/api/metrics` 노출

## 로컬 실행

Postgres 컨테이너가 먼저 떠 있어야 합니다 (저장소 루트 [README](../README.md) 참고).

```bash
cd backend
cp .env.example .env   # DATABASE_URL, PORT, OPENWEATHER_API_KEY(선택) 설정
npm install
npm run seed            # 정거장 데이터 최초 시딩 (최초 1회, 또는 데이터 갱신 시)
npm run dev              # http://localhost:4000, --watch로 코드 변경 시 자동 재시작
```

| 스크립트 | 설명 |
|---|---|
| `npm start` | 프로덕션 모드 실행 (`node src/index.js`) |
| `npm run dev` | 개발 모드 실행 (`node --watch`) |
| `npm run seed` | `src/data/*.csv`, `stationMeta.json`을 PostgreSQL에 시딩 |

## API 엔드포인트

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/health` | 헬스체크 |
| GET | `/api/metrics` | Prometheus 메트릭 (기본 Node.js 메트릭 + HTTP 요청 수/응답시간) |
| GET | `/api/stations` | 전체 정거장 목록 |
| GET | `/api/simulate/defaults` | 정책 시뮬레이터 초기값 (버스 예산은 실데이터 CSV 기준) |
| POST | `/api/simulate` | 정책 시뮬레이션 실행 (예산/혼잡도/민원) |
| POST | `/api/simulate/alternative` | 전체 시나리오 그리드서치로 최적 대안 탐색 |
| POST | `/api/predict` | 월별/시간대별 혼잡도 예측 |
| GET | `/api/predict/bus-data/:month` | 월별 버스 운행 원본 데이터 조회 |
| GET | `/api/logs` | 정책 결정 로그 목록 |
| POST | `/api/logs` | 정책 결정 로그 기록 |
| GET | `/api/scenarios` | 저장된 시나리오 목록 |
| POST | `/api/scenarios` | 시나리오 저장 |
| GET | `/api/weather` | 대전 날씨 (OpenWeatherMap 프록시, 키 없으면 안전 기본값) |

## 구조

```
src/
├── index.js              Express 앱 진입점, 미들웨어/라우터 등록
├── metrics.js             prom-client 레지스트리 + HTTP 메트릭 미들웨어
├── routes/                엔드포인트별 라우터 (위 표와 1:1 대응)
├── engine/
│   ├── policyEngine.js     정책 시뮬레이터 (예산/혼잡도/민원 위험 연산)
│   └── predictionEngine.js 월별/시간대별 혼잡도 예측 로직
├── db/
│   ├── connection.js       pg Pool 생성 + ensureSchema()
│   ├── schema.sql           테이블 정의 (stations, simulation_logs, saved_scenarios)
│   └── seed.js               CSV/JSON 시드 데이터 → PostgreSQL 적재
└── data/                   정거장 좌표, 버스 예산, 정거장 메타데이터 원본
```

## 트러블슈팅

### SQLite(`node:sqlite`) → PostgreSQL 마이그레이션 (커밋 `5d09e8d`)
초기에는 Node 내장 `node:sqlite` 모듈을 썼으나, 배포 환경(컨테이너 재시작 시 파일 유실,
다중 인스턴스 확장 불가)을 고려해 PostgreSQL로 전환했습니다.

### 동기(sync) → 비동기(async) 전환
`node:sqlite`의 `db.prepare(...).all()` / `.run()`은 **동기 호출**이라 라우터 핸들러가
동기 함수로 작성돼 있었습니다. `pg`의 `pool.query(...)`는 **Promise 기반 비동기**라서,
마이그레이션 시 모든 라우터 핸들러를 `async (req, res, next) => { try { ... } catch (err) { next(err) } }`
형태로 바꿔야 했습니다 (`routes/logs.js`, `routes/scenarios.js`, `routes/stations.js` 등).
또한 SQLite의 `?` 위치 플레이스홀더를 PostgreSQL의 `$1, $2, ...` 형식으로,
`JSON.parse(row.xxx_json)` 처리도 PostgreSQL이 JSONB 컬럼을 이미 파싱된 객체로 반환하는
방식에 맞춰 제거했습니다.
