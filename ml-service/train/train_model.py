"""
합성 데이터(+가능하면 실제 데이터)로 정거장별 승객 수요 예측 RandomForest 모델을
학습하고 ml-service/model/model.pkl, metadata.json으로 저장한다.
"""
import json
import os
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SYNTHETIC_PATH = os.path.join(DATA_DIR, "synthetic.csv")
REAL_PATH = os.path.join(DATA_DIR, "real.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

CATEGORICAL_COLUMNS = ["area_type", "day_type", "time_slot", "weather"]
NUMERIC_COLUMNS = ["commercial_score", "is_shared", "base_passengers"]
TARGET_COLUMN = "predicted_passengers"


def load_dataset():
    if not os.path.exists(SYNTHETIC_PATH):
        raise FileNotFoundError(
            f"{SYNTHETIC_PATH} 가 없습니다. 먼저 generate_synthetic_data.py를 실행하세요."
        )
    synthetic_df = pd.read_csv(SYNTHETIC_PATH)
    synthetic_df["source"] = "synthetic"
    frames = [synthetic_df]

    if os.path.exists(REAL_PATH):
        real_df = pd.read_csv(REAL_PATH)
        missing = [c for c in CATEGORICAL_COLUMNS + NUMERIC_COLUMNS + [TARGET_COLUMN] if c not in real_df.columns]
        if missing:
            print(
                f"[train_model] real.csv가 있지만 필요한 컬럼이 없어({missing}) 이번 학습에서는 제외합니다."
            )
        else:
            real_df["source"] = "real"
            frames.append(real_df)
            print(f"[train_model] real.csv {len(real_df)}건을 학습 데이터에 포함합니다.")
    else:
        print("[train_model] real.csv가 없어 합성 데이터만으로 학습합니다.")

    return pd.concat(frames, ignore_index=True)


def build_features(df):
    df = df.copy()
    df["is_shared"] = df["is_shared"].astype(bool).astype(int)

    # 서빙 시에도 동일한 컬럼 순서로 원-핫 인코딩을 재현할 수 있도록
    # 카테고리별 가능한 값 목록을 함께 저장해둔다.
    categories = {col: sorted(df[col].astype(str).unique().tolist()) for col in CATEGORICAL_COLUMNS}

    encoded = pd.get_dummies(df[CATEGORICAL_COLUMNS], columns=CATEGORICAL_COLUMNS)
    features = pd.concat([df[NUMERIC_COLUMNS].reset_index(drop=True), encoded.reset_index(drop=True)], axis=1)
    return features, categories


def main():
    df = load_dataset()
    print(f"[train_model] 전체 학습 데이터 {len(df)}건 (synthetic={sum(df['source'] == 'synthetic')}, "
          f"real={sum(df['source'] == 'real')})")

    features, categories = build_features(df)
    target = df[TARGET_COLUMN]

    x_train, x_test, y_train, y_test = train_test_split(
        features, target, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(x_train, y_train)

    predictions = model.predict(x_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print(f"[train_model] MAE={mae:.2f}  R2={r2:.4f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    bundle = {
        "model": model,
        "feature_columns": features.columns.tolist(),
        "categories": categories,
        "numeric_columns": NUMERIC_COLUMNS,
        "categorical_columns": CATEGORICAL_COLUMNS,
    }
    joblib.dump(bundle, MODEL_PATH)

    metadata = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "mae": round(float(mae), 2),
        "r2": round(float(r2), 4),
        "training_rows": int(len(df)),
        "synthetic_rows": int(sum(df["source"] == "synthetic")),
        "real_rows": int(sum(df["source"] == "real")),
        "model_type": "RandomForestRegressor",
    }
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"[train_model] 모델 저장 완료 -> {MODEL_PATH}")
    print(f"[train_model] 메타데이터 저장 완료 -> {METADATA_PATH}")


if __name__ == "__main__":
    main()
