# backend

대전 트램 AI 시뮬레이션의 API 서버입니다. 정책 시뮬레이션·혼잡도 예측 연산을 수행하고
REST API로 [frontend](../frontend)에 데이터를 내려줍니다. 관제 전용 기능은 JWT 인증으로
보호되어 있습니다.

## 스택

- **Node.js** (>=18) + **Express** + **TypeScript**
- **PostgreSQL** — [`pg`](https://node-postgres.com/) (node-postgres) 드라이버, 커넥션 풀 방식
- **jsonwebtoken** + **bcrypt** — JWT 인증, 비밀번호 해싱
- **Prometheus** — [`prom-client`](https://github.com/siimon/prom-client)로 `/api/metrics` 노출

## 로컬 실행

Postgres 컨테이너가 먼저 떠 있어야 합니다 (저장소 루트 [README](../README.md) 참고).

```bash
cd backend
cp .env.example .env   # DATABASE_URL, PORT, WEATHER_API_KEY, JWT_SECRET, ADMIN_INITIAL_PASSWORD 설정
npm install
npm run seed             # 정거장 데이터 + admin 계정 최초 시딩 (최초 1회, idempotent)
npm run dev               # http://localhost:4000, ts-node --watch로 코드 변경 시 자동 재시작
```

| 스크립트 | 설명 |
|---|---|
| `npm run build` | `tsc`로 컴파일 + 데이터/스키마 자산을 `dist/`로 복사 |
| `npm start` | 빌드된 프로덕션 코드 실행 (`node dist/index.js`) |
| `npm run dev` | 개발 모드 실행 (`ts-node --watch`) |
| `npm run seed` | 정거장 데이터 시딩 + `admin` 계정 생성(idempotent, `ADMIN_INITIAL_PASSWORD` 필요) |

## API 엔드포인트

🔒 표시는 `requireAuth` 미들웨어로 보호되는 엔드포인트입니다 (`Authorization: Bearer <JWT>` 필요).

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/health` | 공개 | 헬스체크 |
| GET | `/api/metrics` | 공개 | Prometheus 메트릭 |
| GET | `/api/stations` | 공개 | 전체 정거장 목록 (시민 대시보드용) |
| GET | `/api/weather` | 공개 | 대전 날씨 (OpenWeatherMap 프록시, 10분 캐시, 키 없거나 실패 시 안전 기본값) |
| POST | `/api/auth/login` | 공개 | 로그인, JWT 발급(24시간 만료) |
| 🔒 GET | `/api/simulate/defaults` | 필요 | 정책 시뮬레이터 초기값 (버스 예산은 실데이터 CSV 기준) |
| 🔒 POST | `/api/simulate` | 필요 | 정책 시뮬레이션 실행 (예산/혼잡도/민원) |
| 🔒 POST | `/api/simulate/alternative` | 필요 | 전체 시나리오 그리드서치로 최적 대안 탐색 |
| 🔒 POST | `/api/predict` | 필요 | 규칙 기반 월별/시간대별 혼잡도 예측 |
| 🔒 POST | `/api/predict/ml` | 필요 | ML 서비스(`ml-service`) 프록시, 실패 시 규칙 기반으로 자동 폴백 |
| 🔒 GET | `/api/predict/bus-data/:month` | 필요 | 월별 버스 운행 원본 데이터 조회 |
| 🔒 GET/POST | `/api/logs` | 필요 | 정책 결정 로그 조회/기록 |
| 🔒 GET/POST | `/api/scenarios` | 필요 | 저장된 시나리오 조회/저장 |
| 🔒 GET | `/api/admin/overview` | 필요 | 정거장/로그/시나리오 건수, DB 상태 |
| 🔒 GET | `/api/admin/logs`, `/api/admin/scenarios` | 필요 | 페이지네이션(`limit`/`offset`) 조회 |
| 🔒 GET | `/api/admin/ml-model-info` | 필요 | ml-service `/model-info` 프록시 (실패 시 503) |
| 🔒 GET | `/api/admin/links` | 필요 | ArgoCD/Grafana URL |

## 구조

```
src/
├── index.ts                Express 앱 진입점, 미들웨어/라우터 등록
├── metrics.ts               prom-client 레지스트리 + HTTP 메트릭 미들웨어
├── middleware/
│   └── auth.ts               requireAuth — JWT 검증 미들웨어
├── routes/                  엔드포인트별 라우터 (위 표와 1:1 대응)
│   ├── auth.ts                로그인/JWT 발급
│   └── admin.ts               관리자 대시보드 전용 API
├── engine/
│   ├── policyEngine.ts        정책 시뮬레이터 (예산/혼잡도/민원 위험 연산)
│   └── predictionEngine.ts    월별/시간대별 혼잡도 예측 로직 (규칙 기반, ML 폴백 대상)
├── db/
│   ├── connection.ts          pg Pool 생성 + ensureSchema()
│   ├── schema.sql              테이블 정의 (stations, simulation_logs, saved_scenarios, admins)
│   └── seed.ts                  CSV/JSON 시드 데이터 → PostgreSQL 적재 + admin 계정 시딩
├── types/index.ts            DB 로우/DTO/요청바디 타입 전체
└── data/                     정거장 좌표, 버스 예산, 정거장 메타데이터 원본
```

## 트러블슈팅

### SQLite(`node:sqlite`) → PostgreSQL 마이그레이션 (커밋 `5d09e8d`)
초기에는 Node 내장 `node:sqlite` 모듈을 썼으나, 배포 환경(컨테이너 재시작 시 파일 유실,
다중 인스턴스 확장 불가)을 고려해 PostgreSQL로 전환했습니다.

### 동기(sync) → 비동기(async) 전환
`node:sqlite`의 `db.prepare(...).all()` / `.run()`은 **동기 호출**이라 라우터 핸들러가
동기 함수로 작성돼 있었습니다. `pg`의 `pool.query(...)`는 **Promise 기반 비동기**라서,
마이그레이션 시 모든 라우터 핸들러를 `async (req, res, next) => { try { ... } catch (err) { next(err) } }`
형태로 바꿔야 했습니다. 또한 SQLite의 `?` 위치 플레이스홀더를 PostgreSQL의 `$1, $2, ...`
형식으로, `JSON.parse(row.xxx_json)` 처리도 PostgreSQL이 JSONB 컬럼을 이미 파싱된 객체로
반환하는 방식에 맞춰 제거했습니다.

### TypeScript 전환 시 발견된 타입 오류 — `simulation_logs`는 구조화된 JSON이 아니었음 (커밋 `bc3fe65`)
backend를 먼저 TypeScript로 전환할 때는 라우트 코드만 보고 `simulation_logs.input_json`/
`results_json`을 `PolicyInputs`/`PolicySimulationResult` 객체로 추정해서 타입을 붙였습니다.
그런데 frontend를 TypeScript로 전환하면서 실제 호출부(`TramSimulation.tsx`의
`handleAcceptPolicy`)를 보니, 이 두 컬럼에는 실제로는 `"배차 6분 / 감축 20%"` 같은
**사람이 읽는 요약 문자열**이 저장되고 있었습니다. `DecisionLog` 컴포넌트가 이 값을 그대로
텍스트로 렌더링하는 것에서도 문자열임이 확인되어, `SimulationLogRow`/`SimulationLogDto`/
`CreateSimulationLogBody` 타입을 `string`으로 정정했습니다. (반면 `saved_scenarios`의
`input_json`/`results_json`은 실제로 구조화된 `PolicyInputs`/`PolicySimulationResult`
객체가 맞았습니다 — 두 테이블이 서로 다른 화면에서 쓰여서 구조가 다릅니다.)
