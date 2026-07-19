const express = require('express');
const db = require('../db/connection');

const router = express.Router();

const toStationDto = (row) => ({
  id: row.id,
  name: row.name,
  lat: row.lat,
  lon: row.lon,
  transferType: row.transfer_type,
  basePassengers: row.base_passengers,
  isShared: !!row.is_shared,
  commercialScore: row.commercial_score,
  areaType: row.area_type,
  predictionBase: row.prediction_base
});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM stations ORDER BY id').all();
  res.json(rows.map(toStationDto));
});

module.exports = router;
