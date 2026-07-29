#!/usr/bin/env python3
"""
k6 --out json 결과(raw-results.json, NDJSON)를 읽어 k6-script.js의 stages와
동일한 구간(10/30/50/100/200명 유지 구간)별로 p50/p95/p99/에러율/RPS를 계산한다.

사용법: python3 scripts/loadtest/analyze.py scripts/loadtest/raw-results.json
"""
import sys
import json
from datetime import datetime, timezone

# k6-script.js의 stages와 동일한 누적 시간(초) 기준 "유지" 구간만 분석 대상으로 삼는다.
# (앞의 20초 ramp-up 구간은 목표 동시접속 수에 아직 도달하지 않은 상태라 제외)
STAGE_WINDOWS = [
    (10, 20, 80),
    (30, 100, 160),
    (50, 180, 240),
    (100, 260, 320),
    (200, 340, 400),
]


def parse_time(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def percentile(sorted_vals, p):
    if not sorted_vals:
        return None
    k = (len(sorted_vals) - 1) * (p / 100)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "scripts/loadtest/raw-results.json"

    durations = []  # (elapsed_seconds, value_ms)
    failed = []     # (elapsed_seconds, value 0/1)
    reqs = []       # elapsed_seconds of each http_reqs point

    t0 = None
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if obj.get("type") != "Point":
                continue
            metric = obj.get("metric")
            data = obj.get("data", {})
            ts = data.get("time")
            if not ts or metric not in ("http_req_duration", "http_req_failed", "http_reqs"):
                continue
            t = parse_time(ts)
            rows.append((t, metric, data.get("value")))

    if not rows:
        print("no data points found")
        return

    t0 = min(r[0] for r in rows)
    for t, metric, value in rows:
        elapsed = (t - t0).total_seconds()
        if metric == "http_req_duration":
            durations.append((elapsed, value))
        elif metric == "http_req_failed":
            failed.append((elapsed, value))
        elif metric == "http_reqs":
            reqs.append(elapsed)

    test_end = (max(r[0] for r in rows) - t0).total_seconds() if rows else 0
    print(f"# 전체 데이터 범위: 0s ~ {test_end:.1f}s")
    print()
    print("| 동시접속 | 표본수 | p50(ms) | p95(ms) | p99(ms) | 에러율 | RPS |")
    print("|---|---|---|---|---|---|---|")

    for vus, start, end in STAGE_WINDOWS:
        window_durations = sorted(v for (e, v) in durations if start <= e < end)
        window_failed = [v for (e, v) in failed if start <= e < end]
        window_reqs = [e for e in reqs if start <= e < end]

        if not window_durations:
            print(f"| {vus} | 0 | - | - | - | - | - | (이 구간 데이터 없음 — 테스트가 이 단계 전에 중단됨) |")
            continue

        p50 = percentile(window_durations, 50)
        p95 = percentile(window_durations, 95)
        p99 = percentile(window_durations, 99)
        err_rate = (sum(window_failed) / len(window_failed) * 100) if window_failed else 0
        rps = len(window_reqs) / (end - start)

        print(f"| {vus} | {len(window_durations)} | {p50:.0f} | {p95:.0f} | {p99:.0f} | {err_rate:.2f}% | {rps:.1f} |")


if __name__ == "__main__":
    main()
