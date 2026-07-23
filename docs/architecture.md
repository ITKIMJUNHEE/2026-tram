# 아키텍처

## 전체 구조

```mermaid
flowchart TB
    User((사용자)) -->|HTTPS| DuckDNS[DuckDNS\noasis-tram.duckdns.org]
    DuckDNS --> Traefik[Traefik Ingress\nk3s 내장]

    subgraph K3s [k3s 클러스터]
        subgraph TramNS [tram 네임스페이스]
            Frontend[frontend\nReact + nginx]
            Backend[backend\nExpress API]
            Postgres[(postgres)]
        end

        subgraph ArgoNS [argocd 네임스페이스]
            ArgoCD[ArgoCD]
        end

        subgraph MonNS [monitoring 네임스페이스]
            Prometheus[Prometheus]
            Grafana[Grafana]
        end

        CertManager[cert-manager]
    end

    Traefik -->|/| Frontend
    Traefik -->|/api| Backend
    Frontend -->|API 호출| Backend
    Backend --> Postgres

    ArgoCD -.배포 관리.-> Frontend
    ArgoCD -.배포 관리.-> Backend
    ArgoCD -.배포 관리.-> Postgres

    Prometheus -.메트릭 수집.-> Backend
    Prometheus -.메트릭 수집.-> K3s
    Grafana -.조회.-> Prometheus

    CertManager -.TLS 인증서 발급.-> Traefik
```

## 계층 설명

- **frontend**: React 기반 UI. 지도(Leaflet)·차트(Recharts) 시각화만 담당하며 연산 로직은 없음.
- **backend**: Express API 서버. 정책 시뮬레이션·혼잡도 예측 연산을 수행하고 PostgreSQL에 결과를 영속화.
- **postgres**: 정거장 데이터, 정책 결정 로그, 저장된 시나리오를 저장.
- **ArgoCD**: `infra/k8s` 경로를 감시하며 git에 반영된 매니페스트를 tram 네임스페이스에 자동 동기화.
- **Prometheus/Grafana**: 클러스터 전체(및 backend의 `/api/metrics`) 리소스·성능 지표 수집·시각화.
- **cert-manager + Traefik**: Let's Encrypt 인증서 자동 발급/갱신 및 HTTP→HTTPS 라우팅.

배포 파이프라인(코드 push부터 실제 배포까지)은 [infra/README.md](../infra/README.md#배포-흐름)를 참고하세요.
