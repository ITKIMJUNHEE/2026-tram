# 학습된 model.pkl은 이미지 빌드 시점에 학습하지 않고 미리 학습된 아티팩트를 COPY한다.
# 이유: 1) GitHub Actions CI 러너는 k3s 내부 Postgres(정거장 특성 데이터 소스)에
#          네트워크로 접근할 수 없어 빌드 중 generate_synthetic_data.py를 실행할 수 없음.
#       2) 학습(training)과 서빙(serving) 이미지 빌드는 분리하는 것이 표준적인 관행이며,
#          매 이미지 빌드마다 재학습하면 빌드 시간이 늘고 배포마다 모델이 미세하게
#          달라져 재현성이 떨어짐.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY model/ ./model/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
