import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../db/connection';
import { runPredictionSimulation } from '../engine/predictionEngine';
import { BusDataItem, PredictionStationInput, PredictRequestBody, StationRow, WeatherCondition, MlPredictRequestBody, MlPredictResponse } from '../types';

const router = express.Router();

const BUS_DATA_DIR = path.join(__dirname, '..', 'data', 'bus');

const loadBusDataForMonth = (month: number): BusDataItem[] => {
  const filePath = path.join(BUS_DATA_DIR, `data_${month}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
};

const loadStationsForPrediction = async (): Promise<PredictionStationInput[]> => {
  const { rows } = await pool.query<StationRow>('SELECT * FROM stations ORDER BY id');
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lon,
    base: row.prediction_base,
    shared: row.is_shared,
    commercialScore: row.commercial_score,
    type: row.area_type
  }));
};

const getSeasonalWeather = (month: number): WeatherCondition => {
  if (month === 7 || month === 8) return { type: 'rain', intensity: 60 };
  if (month === 12 || month === 1 || month === 2) return { type: 'snow', intensity: 50 };
  return { type: 'sunny', intensity: 0 };
};

router.get('/bus-data/:month', (req: Request, res: Response) => {
  const month = Number(req.params.month);
  res.json(loadBusDataForMonth(month));
});

router.post('/', async (req: Request<unknown, unknown, PredictRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { tramInterval, busReduction, signalLevel, isAiMode, timeSlot, month } = req.body || {};
    if (!tramInterval || busReduction === undefined) {
      return res.status(400).json({ error: 'tramInterval, busReduction is required' });
    }

    const stations = await loadStationsForPrediction();
    const busData = loadBusDataForMonth(month || 1);
    const results = runPredictionSimulation(stations, tramInterval, busReduction, busData, signalLevel, isAiMode, timeSlot);
    const weather = getSeasonalWeather(month || 1);

    res.json({ results, busStops: busData, weather });
  } catch (err) {
    next(err);
  }
});

// ML 서비스가 없거나 실패했을 때 규칙 기반 엔진으로 근사치를 계산하는 폴백.
// ML 서비스 스키마(정거장 특성 하나)에 맞춰 단일 정거장만 계산하므로, 배차 간격 등
// runPredictionSimulation에 필요하지만 ML 스키마에는 없는 값은 프론트엔드 기본값으로 채운다.
const runFallbackPrediction = (body: Partial<MlPredictRequestBody>): number => {
  const fallbackStation: PredictionStationInput = {
    id: 0,
    name: 'fallback',
    lat: 0,
    lng: 0,
    base: body.base_passengers ?? 0,
    shared: body.is_shared ?? false,
    commercialScore: body.commercial_score ?? 0,
    type: body.area_type ?? 'residential'
  };
  const timeSlot = body.time_slot === 'morning' || body.time_slot === 'evening' ? body.time_slot : 'day';
  const result = runPredictionSimulation([fallbackStation], 10, 0, [], 2, false, timeSlot);
  return result.stations[0]?.passengers ?? 0;
};

router.post('/ml', async (req: Request<unknown, unknown, MlPredictRequestBody>, res: Response) => {
  const body = req.body || ({} as MlPredictRequestBody);
  const mlServiceUrl = process.env.ML_SERVICE_URL;

  if (mlServiceUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${mlServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as MlPredictResponse;
        return res.json(data);
      }
      console.warn(`[predict/ml] ML 서비스 응답 오류 (status=${response.status}), 규칙 기반 폴백으로 전환합니다.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[predict/ml] ML 서비스 호출 실패, 규칙 기반 폴백으로 전환합니다:', message);
    }
  } else {
    console.warn('[predict/ml] ML_SERVICE_URL이 설정되지 않아 규칙 기반 폴백으로 전환합니다.');
  }

  const predictedPassengers = runFallbackPrediction(body);
  const fallbackResponse: MlPredictResponse = { predicted_passengers: predictedPassengers, source: 'rule-based-fallback' };
  res.json(fallbackResponse);
});

export default router;
