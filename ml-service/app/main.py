import json
import os

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

app = FastAPI(title="Tram ML Service", description="정거장별 승객 수요 예측 서비스")

_bundle = None
_metadata = None


@app.on_event("startup")
def load_model():
    global _bundle, _metadata
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"{MODEL_PATH} 가 없습니다. train_model.py를 먼저 실행하세요.")
    _bundle = joblib.load(MODEL_PATH)

    if os.path.exists(METADATA_PATH):
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _metadata = json.load(f)
    else:
        _metadata = {}


class PredictRequest(BaseModel):
    commercial_score: int = Field(..., ge=0, description="정거장 상업지수")
    area_type: str = Field(..., description="residential | commercial | transit")
    is_shared: bool = Field(..., description="환승역 여부")
    base_passengers: int = Field(..., ge=0)
    day_type: str = Field(..., description="weekday | weekend")
    time_slot: str = Field(..., description="morning | day | evening")
    weather: str = Field(..., description="sunny | cloudy | rain | snow")


class PredictResponse(BaseModel):
    predicted_passengers: int


class ModelInfoResponse(BaseModel):
    trained_at: str
    mae: float
    r2: float
    training_rows: int
    synthetic_rows: int
    real_rows: int
    model_type: str


def build_feature_row(req: PredictRequest) -> pd.DataFrame:
    categories = _bundle["categories"]

    for col, value in (
        ("area_type", req.area_type),
        ("day_type", req.day_type),
        ("time_slot", req.time_slot),
        ("weather", req.weather),
    ):
        if value not in categories[col]:
            raise HTTPException(
                status_code=400,
                detail=f"'{col}' 값 '{value}'을(를) 알 수 없습니다. 허용값: {categories[col]}",
            )

    row = {
        "commercial_score": req.commercial_score,
        "is_shared": int(req.is_shared),
        "base_passengers": req.base_passengers,
    }
    for col in _bundle["categorical_columns"]:
        value = getattr(req, col)
        for category in categories[col]:
            row[f"{col}_{category}"] = 1 if category == value else 0

    frame = pd.DataFrame([row])
    return frame.reindex(columns=_bundle["feature_columns"], fill_value=0)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/model-info", response_model=ModelInfoResponse)
def model_info():
    if not _metadata:
        raise HTTPException(status_code=503, detail="모델 메타데이터를 아직 불러오지 못했습니다.")
    return _metadata


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if _bundle is None:
        raise HTTPException(status_code=503, detail="모델이 아직 로드되지 않았습니다.")

    features = build_feature_row(req)
    prediction = _bundle["model"].predict(features)[0]
    return {"predicted_passengers": max(0, round(float(prediction)))}
