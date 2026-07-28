terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ------------------------------------------------------------------------------
# 보안그룹 — 인바운드 22(SSH, 관리자 IP만)/80/443(전체), 아웃바운드 전체 허용
# ------------------------------------------------------------------------------
resource "aws_security_group" "tram_simulator" {
  # AWS SG의 description 필드는 정규식 제약(영문/숫자/일부 특수문자만)이 있어 한글을 못 쓴다.
  name        = var.security_group_name
  description = "Security group for tram-simulator EC2 instance (SSH/HTTP/HTTPS)"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH (admin IP only)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = var.security_group_name
  }
}

# ------------------------------------------------------------------------------
# EC2 인스턴스
# ------------------------------------------------------------------------------
resource "aws_instance" "tram_simulator" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.tram_simulator.id]

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = var.root_volume_type
  }

  tags = {
    Name = var.instance_name
  }
}

# ------------------------------------------------------------------------------
# Elastic IP — 위 인스턴스에 연결
# ------------------------------------------------------------------------------
resource "aws_eip" "tram_simulator" {
  instance = aws_instance.tram_simulator.id
  domain   = "vpc"

  tags = {
    Name = var.eip_name
  }
}
