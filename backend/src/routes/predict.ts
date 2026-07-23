import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../db/connection';
import { runPredictionSimulation } from '../engine/predictionEngine';
import { BusDataItem, PredictionStationInput, PredictRequestBody, StationRow, WeatherCondition } from '../types';

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

export default router;
