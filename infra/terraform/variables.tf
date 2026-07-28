variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "instance_name" {
  description = "EC2 인스턴스 Name 태그"
  type        = string
  default     = "tram-simulator"
}

variable "instance_type" {
  # 실제 운영 인스턴스에서 IMDSv2(인스턴스 메타데이터 서비스)로 직접 조회해 확인한 값입니다.
  # (curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-type)
  # 확인 결과 t3 계열이 아니라 m7i-flex.large였습니다 (2026-07-28 확인).
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "m7i-flex.large"
}

variable "ami_id" {
  # 실제 운영 인스턴스의 ami-id를 IMDSv2로 확인한 값입니다 (2026-07-28 확인).
  # /etc/os-release 기준 Ubuntu 26.04 LTS(Resolute Raccoon) — 처음 가정했던 24.04가 아니었습니다.
  description = "EC2 AMI ID (ap-northeast-2, Ubuntu 26.04 LTS)"
  type        = string
  default     = "ami-0bc151a94289adb52"
}

variable "key_name" {
  description = "SSH 접속용 키 페어 이름. AWS에 이미 존재해야 하며 Terraform이 새로 생성하지 않습니다."
  type        = string
  default     = "tram-key"
}

variable "root_volume_size" {
  description = "루트 볼륨 크기 (GiB)"
  type        = number
  default     = 30
}

variable "root_volume_type" {
  description = "루트 볼륨 타입"
  type        = string
  default     = "gp3"
}

variable "vpc_id" {
  # 실제 운영 인스턴스가 속한 VPC를 IMDSv2로 확인한 값입니다 (2026-07-28 확인).
  description = "보안그룹을 생성할 VPC ID"
  type        = string
  default     = "vpc-02f0c70bd0cf662c6"
}

variable "subnet_id" {
  # 실제 운영 인스턴스가 속한 서브넷을 IMDSv2로 확인한 값입니다 (2026-07-28 확인).
  description = "EC2 인스턴스를 생성할 서브넷 ID"
  type        = string
  default     = "subnet-047a1aaabccc3a13d"
}

variable "security_group_name" {
  # 실제 운영 보안그룹 이름(콘솔에서 수동 생성 시 자동 부여된 기본값)입니다.
  # 나중에 기존 리소스를 terraform import 하려면 이 이름이 실제 이름과 정확히 일치해야 합니다.
  description = "보안그룹 이름"
  type        = string
  default     = "launch-wizard-1"
}

variable "allowed_ssh_cidr" {
  description = <<-EOT
    SSH(22번 포트) 접속을 허용할 IP 대역(CIDR). 보안을 위해 기본값을 두지 않았으니
    terraform.tfvars에 본인의 실제 공인 IP로 반드시 채워야 합니다 (예: "203.0.113.10/32").
  EOT
  type        = string
}

variable "eip_name" {
  description = "Elastic IP에 붙일 Name 태그"
  type        = string
  default     = "tram-simulator-eip"
}
