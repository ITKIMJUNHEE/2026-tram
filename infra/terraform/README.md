# infra/terraform

현재 AWS 콘솔에서 **수동으로 만든** 인프라(EC2 인스턴스, 보안그룹, Elastic IP)를
문서화하고 재현 가능한 코드로 옮긴 것입니다.

## 지금 상태 — 아직 "관리 안 됨"

**중요**: 이 Terraform 코드는 실제 운영 중인 리소스를 아직 관리하고 있지 않습니다.
`variables.tf`의 기본값들은 실제 인스턴스에서 IMDSv2(인스턴스 메타데이터 서비스)로
직접 조회해 최대한 정확하게 맞춰뒀지만, 이 코드로 `terraform apply`를 실행하면
기존 리소스와는 **별개인 새 EC2/보안그룹/EIP가 새로 생성**됩니다 (같은 리전에
동일한 스펙의 리소스가 하나 더 생기는 것이지, 기존 것을 대체하지 않습니다).

기존의 실제 운영 리소스를 Terraform이 관리하도록 하려면 아래 [`terraform import`](#기존-리소스를-terraform-관리-하에-두려면-import)
절차가 별도로 필요하며, 신중하게 진행해야 합니다.

## 실제 확인한 값 (2026-07-28, IMDSv2로 조회)

| 항목 | 값 | 확인 방법 |
|---|---|---|
| 인스턴스 타입 | `m7i-flex.large` | `.../meta-data/instance-type` (처음 가정했던 t3 계열이 아니었음) |
| AMI | `ami-0bc151a94289adb52` | `.../meta-data/ami-id` |
| OS | Ubuntu **26.04 LTS** (Resolute Raccoon) | `/etc/os-release` (처음 가정했던 24.04가 아니었음) |
| 리전 / AZ | `ap-northeast-2` / `ap-northeast-2c` | `.../dynamic/instance-identity/document` |
| 인스턴스 ID | `i-0cd397fbd4267941e` | 위와 동일 |
| VPC / 서브넷 | `vpc-02f0c70bd0cf662c6` / `subnet-047a1aaabccc3a13d` | `.../network/interfaces/macs/<mac>/vpc-id`, `subnet-id` |
| 보안그룹 | `launch-wizard-1` (`sg-05b37ceaafbc764c1`) | `.../meta-data/security-groups` |
| 키 페어 | `tram-key` | `.../meta-data/public-keys/` |
| Elastic IP | `13.124.72.121` | `.../meta-data/public-ipv4` (요청하신 값과 일치 확인) |
| 루트 볼륨 | 30GiB gp3 | `df -h /` (28G 표시 = 30GiB 중 파일시스템 오버헤드 제외분과 일치) |

## 파일 구성

| 파일 | 내용 |
|---|---|
| `main.tf` | provider, 보안그룹, EC2 인스턴스, Elastic IP 리소스 정의 |
| `variables.tf` | 인스턴스 타입/AMI/키페어/VPC/서브넷 등 변수화 (실측값을 기본값으로 사용) |
| `outputs.tf` | 인스턴스 ID, 퍼블릭 IP, Elastic IP, 보안그룹 ID 출력 |
| `terraform.tfvars.example` | 변수 예시값 (민감하지 않은 것만, `allowed_ssh_cidr`는 플레이스홀더) |

## 사용법 (코드 검증까지만)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # allowed_ssh_cidr를 본인 IP로 채우기
terraform init
terraform fmt -check
terraform validate
```

**`terraform plan` / `terraform apply` / `terraform import`는 여기 포함되지 않습니다.**
지금 이 서버는 실제 운영 중인 인스턴스라서, AWS 자격증명이 잘못 쓰이면 기존 리소스에
영향을 줄 위험이 있습니다. 이 단계는 코드 작성과 문법 검증까지만이 목적입니다.

## 기존 리소스를 Terraform 관리 하에 두려면 (import)

**아직 실행하지 않았습니다.** 나중에 진행할 때는 아래 순서를 참고하세요.

1. `terraform.tfvars`의 `allowed_ssh_cidr`를 실제 보안그룹의 SSH 인바운드 규칙과
   **정확히 일치**하게 맞춥니다 (metadata API로는 인바운드 규칙 자체는 조회가 안 되므로
   AWS 콘솔이나 `aws ec2 describe-security-groups --group-ids sg-05b37ceaafbc764c1`로
   직접 확인해야 합니다).
2. 아래 명령으로 각 리소스를 하나씩 state에 가져옵니다.

   ```bash
   terraform import aws_security_group.tram_simulator sg-05b37ceaafbc764c1
   terraform import aws_instance.tram_simulator i-0cd397fbd4267941e
   terraform import aws_eip.tram_simulator eipalloc-XXXXXXXX   # allocation ID는 콘솔/CLI로 조회 필요
   ```

3. `terraform plan`으로 diff가 없는지(또는 의도한 diff만 있는지) 반드시 확인한 뒤에만
   `terraform apply`를 고려합니다. diff가 있다면 코드를 실제 리소스에 맞춰 수정하는
   것이 먼저입니다 (반대로 실제 리소스를 바꾸면 안 됩니다).

## .gitignore

루트 `.gitignore`에 다음이 추가되어 있습니다 — `.tfstate`, `.terraform/`, 실제 값이 든
`.tfvars`는 커밋되지 않고, 예시 파일(`*.tfvars.example`)만 커밋됩니다.

```
*.tfstate
*.tfstate.*
.terraform/
*.tfvars
!*.tfvars.example
```
