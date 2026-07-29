# infra/k8s — Secret 관리

이 디렉토리의 매니페스트는 ArgoCD `tram-app`이 git 기준으로 자동 동기화합니다.
**Secret은 예외**입니다 — 비밀값을 평문 YAML로 git에 커밋하면 안 되므로, Secret
리소스는 이 디렉토리에 두지 않고 클러스터에 `kubectl`로 직접 생성합니다.
대신 `server.yaml`/`postgres.yaml`의 Deployment는 각각 `envFrom.secretRef` /
`valueFrom.secretKeyRef`로 아래 Secret들을 참조하도록 미리 준비되어 있습니다.

## `postgres-secrets` 생성

`postgres` Deployment(`infra/k8s/postgres.yaml`)가 참조하는 Secret 이름은
`postgres-secrets`이고, 다음 키가 필요합니다.

| 키 | 용도 |
|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL 컨테이너의 `tram` 계정 비밀번호 |

```bash
kubectl create secret generic postgres-secrets \
  --namespace tram \
  --from-literal=POSTGRES_PASSWORD="tram"
```

⚠️ **주의**: `server.yaml`의 `DATABASE_URL`이 `postgresql://tram:tram@postgres:5432/tram_db`로
비밀번호 `tram`을 그대로 가정하고 있습니다. 위 값을 다른 값으로 바꾸면 `server.yaml`의
`DATABASE_URL`도 함께 바꿔야 하며, 그렇지 않으면 backend가 DB에 연결하지 못합니다.
지금 단계에서는 반드시 기존과 동일하게 `"tram"`으로 생성하세요.

## `server-secrets` 생성

`server` Deployment(`infra/k8s/server.yaml`)가 참조하는 Secret 이름은
`server-secrets`이고, 다음 두 키가 필요합니다.

| 키 | 용도 |
|---|---|
| `JWT_SECRET` | 로그인 시 발급하는 JWT 서명 비밀키 (`POST /api/auth/login`) |
| `ADMIN_INITIAL_PASSWORD` | `npm run seed` 최초 실행 시 `admin` 계정을 만들 때만 쓰이는 초기 비밀번호. 계정이 이미 있으면 무시됨(idempotent) |

```bash
kubectl create secret generic server-secrets \
  --namespace tram \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=ADMIN_INITIAL_PASSWORD="원하는-초기-비밀번호로-교체"
```

이미 Secret이 있는 상태에서 값을 바꾸고 싶다면:

```bash
kubectl delete secret server-secrets -n tram
# 위 create 명령 다시 실행
```

또는 개별 키만 바꾸고 싶다면 `kubectl edit secret server-secrets -n tram` (값은 base64로
직접 인코딩해서 넣어야 함, `echo -n '값' | base64` 참고).

## admin 계정 생성 (최초 1회)

`server-secrets`가 만들어진 뒤 `server` 파드가 그 값을 환경변수로 갖고 있는 상태에서,
서버 파드 안에서 시딩 스크립트를 실행합니다.

```bash
kubectl exec -n tram deploy/server -- node dist/db/seed.js
```

이미 `admins` 테이블에 `admin` 계정이 있으면 아무것도 하지 않고 건너뜁니다(idempotent).

## 순서 정리

1. `kubectl create secret generic postgres-secrets ...` (위 명령, 반드시 `POSTGRES_PASSWORD="tram"`)
2. `kubectl create secret generic server-secrets ...` (위 명령)
3. `kubectl apply -f infra/k8s/` 또는 ArgoCD 동기화로 `postgres`/`server` Deployment가 Secret을 읽도록 재기동
4. `kubectl exec -n tram deploy/server -- node dist/db/seed.js` 로 admin 계정 생성
5. `https://oasis-tram.duckdns.org`에서 `admin` / 위에서 넣은 `ADMIN_INITIAL_PASSWORD`로 로그인 확인

**주의**: Secret이 클러스터에 없는 상태로 `postgres-secrets`/`server-secrets`를 참조하는
매니페스트가 배포되면 파드가 `CreateContainerConfigError`로 기동에 실패합니다. Secret을
먼저 만들고 나서 배포하세요.

## 기존 클러스터에 이미 떠 있는 postgres에 이 변경을 적용하는 경우

이미 평문 `POSTGRES_PASSWORD="tram"`으로 떠 있던 기존 클러스터에 이 변경(Secret 참조로
전환)을 반영할 때는, 위 1번(`postgres-secrets` 생성, 값은 반드시 기존과 동일한 `"tram"`)을
먼저 실행한 뒤 `postgres` Deployment를 재기동해야 합니다. 값이 다르면 Postgres 컨테이너가
기존 데이터 볼륨의 계정 비밀번호와 다른 값으로 뜨게 되어 `server`가 DB에 재연결하지
못합니다 (기존 데이터를 지우고 새로 초기화하는 게 아니라면 값을 절대 바꾸지 마세요).
