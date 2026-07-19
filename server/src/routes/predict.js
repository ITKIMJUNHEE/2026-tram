const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db/connection');
const { runPredictionSimulation } = require('../engine/predictionEngine');

const router = express.Router();

const BUS_DATA_DIR = path.join(__dirname, '..', 'data', 'bus');

const loadBusDataForMonth = (month) => {
  const filePath = path.join(BUS_DATA_DIR, `data_${month}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
};

const loadStationsForPrediction = () => {
  const rows = db.prepare('SELECT * FROM stations ORDER BY id').all();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lon,
    base: row.prediction_base,
    shared: !!row.is_shared,
    commercialScore: row.commercial_score,
    type: row.area_type
  }));
};

const getSeasonalWeather = (month) => {
  if (month === 7 || month === 8) return { type: 'rain', intensity: 60 };
  if (month === 12 || month === 1 || month === 2) return { type: 'snow', intensity: 50 };
  return { type: 'sunny', intensity: 0 };
};

router.get('/bus-data/:month', (req, res) => {
  const month = Number(req.params.month);
  res.json(loadBusDataForMonth(month));
});

router.post('/', (req, res) => {
  const { tramInterval, busReduction, signalLevel, isAiMode, timeSlot, month } = req.body || {};
  if (!tramInterval || busReduction === undefined) {
    return res.status(400).json({ error: 'tramInterval, busReduction is required' });
  }

  const stations = loadStationsForPrediction();
  const busData = loadBusDataForMonth(month || 1);
  const results = runPredictionSimulation(stations, tramInterval, busReduction, busData, signalLevel, isAiMode, timeSlot);
  const weather = getSeasonalWeather(month || 1);

  res.json({ results, busStops: busData, weather });
});

module.exports = router;
