"""
DB(simulation_logs, saved_scenarios)에 정거장별 예측 학습에 쓸 수 있는 실제
수치 데이터가 있는지 확인하고, 있으면 ml-service/train/data/real.csv로 추출한다.

결론이 "사용 불가"로 나오면 억지로 데이터를 만들어내지 않고 그 사실만 보고한다.
"""
import json
import os

import pandas as pd
import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://tram:tram@localhost:5432/tram_db")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "data", "real.csv")


def fetch_all(cur, query):
    cur.execute(query)
    return cur.fetchall()


def try_extract_station_rows(results_json):
    """results_json 안에 정거장별 breakdown(stations 배열)이 있으면 그 행들을 반환한다."""
    if not isinstance(results_json, dict):
        return []
    stations = results_json.get("stations")
    if not isinstance(stations, list) or len(stations) == 0:
        return []
    sample = stations[0]
    if not isinstance(sample, dict) or "id" not in sample or "passengers" not in sample:
        return []
    return stations


def main():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            sim_logs = fetch_all(cur, "SELECT id, input_json, results_json FROM simulation_logs")
            scenarios = fetch_all(cur, "SELECT id, input_json, results_json, weather_json FROM saved_scenarios")
    finally:
        conn.close()

    print(f"[extract_real_data] simulation_logs {len(sim_logs)}건, saved_scenarios {len(scenarios)}건 조회됨")

    extracted_rows = []

    for row in sim_logs:
        results = row["results_json"]
        # simulation_logs.input_json/results_json은 구조화된 객체가 아니라
        # TramSimulation.jsx가 만드는 "배차 6분 / 감축 20%" 같은 요약 문자열이라
        # (backend/src/types/index.ts 참고) 정거장별 수치로 파싱할 수 없다.
        if isinstance(results, str):
            continue
        extracted_rows.extend(try_extract_station_rows(results))

    for row in scenarios:
        results = row["results_json"]
        if isinstance(results, str):
            try:
                results = json.loads(results)
            except (TypeError, json.JSONDecodeError):
                continue
        extracted_rows.extend(try_extract_station_rows(results))

    if not extracted_rows:
        print(
            "[extract_real_data] 결론: 실제 데이터는 학습에 사용할 수 없습니다.\n"
            "  - simulation_logs: input_json/results_json이 정책 시뮬레이터가 만든 요약 문자열"
            "(예: '배차 6분 / 감축 20%')이라 정거장별 수치 데이터가 아님. 현재 0건이기도 함.\n"
            "  - saved_scenarios: results_json은 policyEngine의 전체 예산/혼잡도 결과"
            "(PolicySimulationResult)이며 정거장별 breakdown(stations 배열)이 없음. "
            "즉 '트램 예측 지도'(predictionEngine) 화면의 결과가 아니라 '정책 시뮬레이터' "
            "화면의 결과가 저장된 것이라 이번 목적(정거장별 승객 예측)에 맞지 않음.\n"
            "  -> 합성 데이터만으로 학습을 진행합니다."
        )
        return

    df = pd.DataFrame(extracted_rows)
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"[extract_real_data] {len(df)}건 추출 -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
