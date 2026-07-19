const express = require('express');
const db = require('../db/connection');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM saved_scenarios ORDER BY id DESC').all();
  res.json(rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    inputs: JSON.parse(row.input_json),
    results: JSON.parse(row.results_json),
    weather: JSON.parse(row.weather_json)
  })));
});

router.post('/', (req, res) => {
  const { inputs, results, weather } = req.body || {};
  if (!inputs || !results) {
    return res.status(400).json({ error: 'inputs, results is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO saved_scenarios (input_json, results_json, weather_json)
    VALUES (?, ?, ?)
  `);
  const info = stmt.run(JSON.stringify(inputs), JSON.stringify(results), JSON.stringify(weather || {}));

  const row = db.prepare('SELECT * FROM saved_scenarios WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({
    id: row.id,
    createdAt: row.created_at,
    inputs: JSON.parse(row.input_json),
    results: JSON.parse(row.results_json),
    weather: JSON.parse(row.weather_json)
  });
});

module.exports = router;
