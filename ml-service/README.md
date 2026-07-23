# ml-service

**FastAPI + scikit-learn** 기반 정거장별 승객 수요 예측 마이크로서비스입니다.
[backend](../backend)의 `predictionEngine.ts`(규칙 기반 예측)는 그대로 폴백용으로 유지하고,
이 서비스는 선택적으로 호출되는 ML 기반 예측을 제공합니다.

## 배경 / 데이터 현황

- `stations` 테이블: 45개 정거장, 특성 컬럼(commercial_score, area_type, is_shared, base_passengers 등) 보유.
- `simulation_logs`: 0건. 있어도 input/results가 구조화된 JSON이 아니라 정책 시뮬레이터가 만든
  요약 문자열(`"배차 6분 / 감축 20%"`)이라 정거장별 수치 학습에 쓸 수 없음.
- `saved_scenarios`: 1건. results_json은 정책 시뮬레이터(policyEngine)의 예산/혼잡도 결과라
  정거장별 breakdown이 없어 이번 목적(정거장별 승객 예측)에 맞지 않음.
- **결론: 실사용 데이터는 이번 학습에 활용 불가. 합성 데이터만으로 학습했습니다.**
  (`train/extract_real_data.py`가 매번 이 판단을 재확인하고, 조건이 맞으면 자동으로
  `train/data/real.csv`를 만들어 `train_model.py`가 자동으로 함께 학습하도록 되어 있음)

## 구조

```
app/main.py                      FastAPI 서빙 (POST /predict, GET /health, GET /model-info)
train/generate_synthetic_data.py  stations 테이블 기준 합성 학습 데이터 생성 (수천 건)
train/extract_real_data.py        DB에 실사용 가능한 데이터가 있는지 확인 후 추출(현재는 불가 판정)
train/train_model.py              RandomForestRegressor 학습, model.pkl + metadata.json 저장
model/model.pkl                   학습된 모델 + 원-핫 인코딩 메타데이터 (joblib)
model/metadata.json               학습 시점, MAE/R², 학습 데이터 건수
```

## 재학습 방법

```bash
export DATABASE_URL=postgresql://tram:tram@localhost:5432/tram_db  # kubectl port-forward svc/postgres 등으로 연결
pip install -r requirements.txt
python train/generate_synthetic_data.py   # train/data/synthetic.csv 생성
python train/extract_real_data.py         # 실데이터 사용 가능 여부 확인 (가능하면 real.csv 생성)
python train/train_model.py               # model/model.pkl, model/metadata.json 갱신
```

## 현재 모델 성능 (2026-07-23 학습 기준)

| 지표 | 값 |
|---|---|
| 학습 데이터 | 5,400건 (합성 5,400 + 실제 0) |
| MAE | 226.73명 |
| R² | 0.9854 |

## API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/health` | 헬스체크 |
| GET | `/model-info` | 학습 시점, MAE/R², 학습 데이터 건수 |
| POST | `/predict` | 정거장 특성 + 요일/시간대/날씨 → 예측 승객 수 |

`backend`는 `POST /api/predict/ml`에서 이 서비스를 프록시 호출하며, 응답이 없거나 에러가 나면
조용히 규칙 기반 `predictionEngine`으로 폴백합니다 (`ML_SERVICE_URL` 환경변수로 연결).
