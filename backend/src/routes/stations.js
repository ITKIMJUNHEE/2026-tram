const express = require('express');
const { pool } = require('../db/connection');

const router = express.Router();

const toStationDto = (row) => ({
  id: row.id,
  name: row.name,
  lat: row.lat,
  lon: row.lon,
  transferType: row.transfer_type,
  basePassengers: row.base_passengers,
  isShared: row.is_shared,
  commercialScore: row.commercial_score,
  areaType: row.area_type,
  predictionBase: row.prediction_base
});

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stations ORDER BY id');
    res.json(rows.map(toStationDto));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
