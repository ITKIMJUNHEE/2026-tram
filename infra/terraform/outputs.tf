output "instance_id" {
  description = "EC2 인스턴스 ID"
  value       = aws_instance.tram_simulator.id
}

output "instance_public_ip" {
  description = "인스턴스에 기본 할당된 퍼블릭 IP (Elastic IP 연결 전 값 — 실제 접속 주소는 elastic_ip 출력을 사용)"
  value       = aws_instance.tram_simulator.public_ip
}

output "elastic_ip" {
  description = "인스턴스에 연결된 Elastic IP (DuckDNS가 가리키는 주소)"
  value       = aws_eip.tram_simulator.public_ip
}

output "security_group_id" {
  description = "보안그룹 ID"
  value       = aws_security_group.tram_simulator.id
}
