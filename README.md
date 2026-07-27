# 대전 트램 AI 시뮬레이션 (Daejeon Tram Policy Simulator)

정거장 좌표·시뮬레이션 로직이 프론트엔드에 하드코딩되어 있던 해커톤 프로젝트를,
**React + Express + PostgreSQL** 3-Tier 구조로 마이그레이션하고, GitOps 기반 쿠버네티스
배포·모니터링까지 갖춘 프로젝트입니다.

**배포 주소**: https://oasis-tram.duckdns.org

## 스택

`Node.js` `Express` `React 19` `PostgreSQL` `Docker` `Kubernetes (k3s)` `ArgoCD`
`Prometheus` `Grafana` `cert-manager` `Traefik` `GitHub Actions`
`TypeScript` (예정) · `Python / FastAPI` (예정) · `Terraform` (예정)

## 하위 폴더

| 폴더 | 설명 |
|---|---|
| [`backend/`](backend/) | Express API 서버 — 정책 시뮬레이션/혼잡도 예측 연산 ([README](backend/README.md)) |
| [`frontend/`](frontend/) | React 웹 UI — 지도·차트 시각화 ([README](frontend/README.md)) |
| [`ml-service/`](ml-service/) | (예정) FastAPI + scikit-learn 승객 수요 예측 서비스 ([README](ml-service/README.md)) |
| [`infra/`](infra/) | 쿠버네티스 매니페스트, ArgoCD, 모니터링, (예정) Terraform ([README](infra/README.md)) |
| [`docs/`](docs/) | 아키텍처, 요구사항 정의서 |

## 로컬 실행

두 가지 방식을 지원합니다.

- **Docker Compose 모드**: `backend`/`frontend`/`postgres` 3개 컨테이너를 한 번에 띄웁니다. 배포·통합 테스트에 적합합니다.
- **로컬 개발 모드**: `npm run dev`로 backend/frontend를 로컬 Node 프로세스로 직접 띄웁니다. 코드 수정 후 즉시 반영(hot reload)되어 빠른 개발에 적합합니다. Postgres만 컨테이너로 띄우고 나머지는 로컬에서 실행합니다.

두 모드는 DB 접속 정보가 다릅니다. `backend/.env`(로컬 개발 모드, `DATABASE_URL=...@localhost:5432/...`)와
`docker-compose.yml`의 `server.environment`(Compose 모드, `DATABASE_URL=...@postgres:5432/...`)는
서로 다른 용도이니 혼동하지 마세요. Compose 네트워크 안에서는 서비스 이름(`postgres`)이 곧 호스트명이 되기 때문입니다.

### Docker Compose로 전체 실행

```bash
# 1. 전체 스택(postgres + server + client) 빌드 및 기동
docker compose up -d --build

# 2. 정거장 데이터 시딩 (최초 1회, 또는 데이터 갱신 시)
docker compose run --rm server npm run seed

# 3. 브라우저에서 http://localhost:3000 접속

# 4. 로그 보기
docker compose logs -f server   # client, postgres 로 대체 가능

# 5. 종료
docker compose down             # 컨테이너만 정리 (DB 데이터는 유지)
docker compose down -v          # DB 볼륨까지 삭제
```

### 로컬 개발 모드

```bash
# 1. Postgres 컨테이너 실행 (최초 1회)
docker run -d --name tram-postgres -e POSTGRES_USER=tram -e POSTGRES_PASSWORD=tram -e POSTGRES_DB=tram_db -p 5432:5432 postgres:16

# 2. backend/.env 에 DATABASE_URL 설정 (backend/.env.example 참고)
#    DATABASE_URL=postgresql://tram:tram@localhost:5432/tram_db

npm run install:all   # backend + frontend 의존성 설치
npm run seed           # PostgreSQL에 정거장 데이터 시딩 (최초 1회, 또는 데이터 갱신 시)
npm run dev             # backend(:4000) + frontend(:3000) 동시 실행
```

브라우저에서 http://localhost:3000 접속 (로그인 ID: `admin`).

날씨 표시 기능(선택)은 `backend/.env`에 `WEATHER_API_KEY`를 넣으면 실데이터로 동작하고,
키가 없으면 안전 기본값(4°C, 흐림)으로 대체됩니다. `backend/.env.example` 참고.

### 개별 실행

```bash
npm run --prefix backend dev    # 백엔드만
npm run --prefix frontend start  # 프론트엔드만 (proxy로 :4000 API 연동)
```

## 더 알아보기

- API 엔드포인트 전체 목록: [backend/README.md](backend/README.md)
- 배포/인프라 구조, 배포 흐름 다이어그램: [infra/README.md](infra/README.md)
- 전체 아키텍처 다이어그램: [docs/architecture.md](docs/architecture.md)
- 기능/비기능 요구사항 정의서: [docs/requirements.md](docs/requirements.md)
