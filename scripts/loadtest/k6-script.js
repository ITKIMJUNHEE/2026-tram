// 시민 대시보드 공개 API 단계적 부하테스트.
// 대상: 인증이 필요 없는 GET 엔드포인트만 (쓰기 API/DB 적재 API는 제외 —
// 반복 실행으로 더미 데이터가 쌓이면 안 되기 때문).
//
// 실행:
//   k6 run --out json=scripts/loadtest/raw-results.json \
//     --summary-export=scripts/loadtest/summary.json \
//     scripts/loadtest/k6-script.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://oasis-tram.duckdns.org';
const ENDPOINTS = ['/api/health', '/api/stations', '/api/weather'];

export const options = {
  scenarios: {
    citizen_dashboard: {
      executor: 'ramping-vus',
      startVUs: 0,
      // 각 단계 사이 20초 짧은 ramp-up 포함, 목표 동시접속에서 1분 유지.
      stages: [
        { duration: '20s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '20s', target: 30 },
        { duration: '1m', target: 30 },
        { duration: '20s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '20s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '20s', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  // 실제 운영 서비스 대상 테스트라, 에러율이 50%를 넘으면 이후 단계를
  // 진행하지 않고 즉시 전체 테스트를 중단한다 (사람이 개입하지 않아도
  // 안전하게 멈추도록 k6 자체 threshold abort 기능 사용).
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.5', abortOnFail: true, delayAbortEval: '15s' }],
  },
};

export default function () {
  for (const path of ENDPOINTS) {
    const res = http.get(`${BASE_URL}${path}`, { tags: { endpoint: path } });
    check(res, { 'status is 200': (r) => r.status === 200 });
  }
  sleep(1);
}
