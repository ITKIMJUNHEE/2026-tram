#!/usr/bin/env python3
"""
트램 ON — 아키텍처 다이어그램 생성 스크립트 (Python `diagrams` 라이브러리)

실행:
    python3 -m pip install diagrams  # + apt install graphviz, fonts-nanum(한글 폰트)
    python3 scripts/generate-architecture-diagram.py

주의: 지금 인프라는 EC2 단일 인스턴스 / 단일 리전(ap-northeast-2) / 단일 AZ /
k3s 단일 노드 클러스터다. Multi-AZ, 이중화, DR 같은 건 실제로 없으므로
있는 것처럼 그리지 않는다 (모든 컴포넌트가 하나의 EC2 박스 안에 있는 것으로 표현).
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.onprem.client import User
from diagrams.onprem.network import Internet, Traefik
from diagrams.onprem.container import Docker, K3S
from diagrams.onprem.vcs import Github
from diagrams.onprem.ci import GithubActions
from diagrams.onprem.gitops import Argocd
from diagrams.onprem.monitoring import Prometheus, Grafana
from diagrams.onprem.certificates import CertManager
from diagrams.onprem.database import Postgresql
from diagrams.programming.language import Nodejs, Python
from diagrams.programming.framework import React, Fastapi
from diagrams.generic.blank import Blank

FONT = "NanumBarunGothic"

GRAPH_ATTR = {
    "fontname": FONT,
    "fontsize": "22",
    "bgcolor": "white",
    "pad": "0.6",
    "nodesep": "0.6",
    "ranksep": "0.9",
    "splines": "ortho",
}
NODE_ATTR = {"fontname": FONT, "fontsize": "13"}
EDGE_ATTR = {"fontname": FONT, "fontsize": "11"}


def system_architecture() -> None:
    with Diagram(
        "트램 ON — 시스템 아키텍처 (EC2 단일 인스턴스 · ap-northeast-2 · 단일 AZ)",
        filename="docs/diagrams/system-architecture",
        direction="TB",
        show=False,
        graph_attr=GRAPH_ATTR,
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        user = User("시민 / 관리자")
        internet = Internet("Internet")

        # DuckDNS에 해당하는 정확한 아이콘이 diagrams 라이브러리에 없어
        # (다른 DNS 브랜드 아이콘으로 오인시키지 않기 위해) 텍스트 라벨 박스로 대체
        duckdns = Blank("DuckDNS\n(Dynamic DNS)")

        with Cluster(
            "EC2 인스턴스 (m7i-flex.large, ap-northeast-2c 단일 AZ)",
            graph_attr={"margin": "24", "fontname": FONT},
        ):
            with Cluster(
                "k3s — 단일 노드 클러스터",
                graph_attr={"margin": "24", "fontname": FONT},
            ):
                k3s_node = K3S("k3s\n(단일 노드)")
                ingress = Traefik("Traefik\nIngress Controller")
                certmgr = CertManager("cert-manager\n(Let's Encrypt)")

                with Cluster(
                    "애플리케이션 파드",
                    graph_attr={"margin": "28", "fontname": FONT},
                ):
                    frontend = React("FrontEnd\n(React + TS)")
                    backend = Nodejs("BackEnd\n(Express + TS)")
                    mlservice = Fastapi("ML Service\n(FastAPI + Python)")
                    db = Postgresql("PostgreSQL")

                    ingress >> Edge(label="/") >> frontend
                    ingress >> Edge(label="/api") >> backend
                    backend >> Edge(label="추론 요청") >> mlservice
                    backend >> Edge(label="쿼리") >> db
                    mlservice >> Edge(style="dashed", label="학습 데이터") >> db

                k3s_node >> Edge(color="gray50") >> ingress
                certmgr >> Edge(style="dashed", label="인증서 발급") >> ingress

            with Cluster(
                "모니터링",
                graph_attr={"margin": "20", "fontname": FONT},
            ):
                prom = Prometheus("Prometheus")
                graf = Grafana("Grafana")
                prom >> Edge(label="시각화") >> graf

            backend >> Edge(style="dotted", color="gray40", label="메트릭") >> prom
            mlservice >> Edge(style="dotted", color="gray40") >> prom

        with Cluster(
            "CI/CD (GitOps)",
            graph_attr={"margin": "20", "fontname": FONT},
        ):
            gh = Github("GitHub Repo")
            gha = GithubActions("GitHub Actions\n(빌드/테스트)")
            ghcr = Docker("GHCR\n(컨테이너 이미지)")
            argocd = Argocd("ArgoCD\n(자동 동기화)")

            gh >> gha >> ghcr >> Edge(label="이미지 태그 갱신 감지") >> argocd

        user >> internet >> duckdns >> Edge(label="A 레코드") >> ingress
        argocd >> Edge(color="firebrick", style="bold", label="배포 (kubectl apply)") >> k3s_node


def cicd_pipeline() -> None:
    with Diagram(
        "트램 ON — 배포 파이프라인 (GitHub Actions → GHCR → ArgoCD → k3s)",
        filename="docs/diagrams/cicd-pipeline",
        direction="LR",
        show=False,
        graph_attr=GRAPH_ATTR,
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        dev = User("개발자")

        with Cluster("GitHub"):
            gh = Github("Repo\n(git push)")
            gha = GithubActions("GitHub Actions\n(빌드 + 테스트)")
            gh >> gha

        ghcr = Docker("GHCR\n(이미지 레지스트리)")
        argocd = Argocd("ArgoCD\n(변경 감지 + 동기화)")

        with Cluster("EC2 인스턴스 (단일 AZ, ap-northeast-2)"):
            with Cluster("k3s — 단일 노드 클러스터"):
                k3s = K3S("k3s")
                with Cluster("배포된 파드"):
                    frontend = React("FrontEnd")
                    backend = Nodejs("BackEnd")
                    mlservice = Fastapi("ML Service")

                k3s >> [frontend, backend, mlservice]

        dev >> Edge(label="git push") >> gh
        gha >> Edge(label="이미지 빌드 + 푸시") >> ghcr
        ghcr >> Edge(label="새 이미지 태그 감지") >> argocd
        argocd >> Edge(color="firebrick", style="bold", label="매니페스트 동기화 (kubectl apply)") >> k3s


if __name__ == "__main__":
    system_architecture()
    print("generated: docs/diagrams/system-architecture.png")
    cicd_pipeline()
    print("generated: docs/diagrams/cicd-pipeline.png")
