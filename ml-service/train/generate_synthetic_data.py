"""
합성 학습 데이터 생성 스크립트.

backend/src/engine/predictionEngine.ts의 규칙 기반 계산 로직(정거장 유형별
시간대 가중치, 상업지수 가중치, 신호 우선순위 등)을 "그대로 베끼는" 것이 아니라,
합성 데이터를 만들기 위한 근사 공식으로 재구성했다. 실제 엔진과 계수가 다르고,
day_type(평일/주말)과 세분화된 weather 가중치 등 엔진에는 없는 차원도 추가했다.
여기에 곱셈 노이즈를 섞어서 모델이 공식을 그대로 암기하지 못하게 한다.

stations 테이블(45개 정거장)의 실제 특성을 DB에서 읽어와 기준으로 삼는다.
"""
import os
import random

import pandas as pd
import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://tram:tram@localhost:5432/tram_db")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "data", "synthetic.csv")

DAY_TYPES = ["weekday", "weekend"]
TIME_SLOTS = ["morning", "day", "evening"]
WEATHERS = ["sunny", "cloudy", "rain", "snow"]

# area_type별 시간대 수요 가중치 (근사치, predictionEngine의 typeFactor를 참고해
# 더 세분화·완만하게 재구성 — residential은 아침 통근 피크, commercial은 저녁 피크,
# transit(환승)은 양쪽 피크에서 모두 붐빈다는 동일한 직관만 유지)
AREA_TIME_FACTOR = {
    "residential": {"morning": 2.3, "day": 1.0, "evening": 0.9},
    "commercial": {"morning": 0.9, "day": 1.1, "evening": 2.1},
    "transit": {"morning": 1.8, "day": 1.0, "evening": 1.6},
}

DAY_TYPE_FACTOR = {"weekday": 1.0, "weekend": 0.78}

WEATHER_FACTOR = {"sunny": 1.0, "cloudy": 0.97, "rain": 0.88, "snow": 0.78}

SAMPLES_PER_COMBINATION = 5
NOISE_STD = 0.08


def fetch_stations():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, name, commercial_score, area_type, is_shared, base_passengers, "
                "prediction_base FROM stations ORDER BY id"
            )
            return cur.fetchall()
    finally:
        conn.close()


def simulate_passengers(station, day_type, time_slot, weather, rng):
    area_factor = AREA_TIME_FACTOR.get(station["area_type"], AREA_TIME_FACTOR["residential"])[time_slot]
    day_factor = DAY_TYPE_FACTOR[day_type]
    weather_factor = WEATHER_FACTOR[weather]
    commercial_factor = 1 + station["commercial_score"] * 0.12
    shared_factor = 1.15 if station["is_shared"] else 1.0

    base = station["prediction_base"]
    expected = base * area_factor * day_factor * weather_factor * commercial_factor * shared_factor

    noise = rng.gauss(1.0, NOISE_STD)
    return max(0, round(expected * noise))


def main():
    rng = random.Random(42)
    stations = fetch_stations()
    print(f"[generate_synthetic_data] stations 테이블에서 {len(stations)}개 정거장 로드")

    rows = []
    for station in stations:
        for day_type in DAY_TYPES:
            for time_slot in TIME_SLOTS:
                for weather in WEATHERS:
                    for _ in range(SAMPLES_PER_COMBINATION):
                        passengers = simulate_passengers(station, day_type, time_slot, weather, rng)
                        rows.append({
                            "station_id": station["id"],
                            "commercial_score": station["commercial_score"],
                            "area_type": station["area_type"],
                            "is_shared": station["is_shared"],
                            "base_passengers": station["base_passengers"],
                            "prediction_base": station["prediction_base"],
                            "day_type": day_type,
                            "time_slot": time_slot,
                            "weather": weather,
                            "predicted_passengers": passengers,
                        })

    df = pd.DataFrame(rows)
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"[generate_synthetic_data] {len(df)}건 생성 -> {OUTPUT_PATH}")
    print(df.describe(include="all").transpose().to_string())


if __name__ == "__main__":
    main()
