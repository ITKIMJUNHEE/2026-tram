import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { SavedScenarioRow, SavedScenarioDto, CreateSavedScenarioBody } from '../types';

const router = express.Router();

const toScenarioDto = (row: SavedScenarioRow): SavedScenarioDto => ({
  id: row.id,
  createdAt: row.created_at,
  inputs: row.input_json,
  results: row.results_json,
  weather: row.weather_json
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query<SavedScenarioRow>('SELECT * FROM saved_scenarios ORDER BY id DESC');
    res.json(rows.map(toScenarioDto));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request<unknown, unknown, CreateSavedScenarioBody>, res: Response, next: NextFunction) => {
  try {
    const { inputs, results, weather } = req.body || {};
    if (!inputs || !results) {
      return res.status(400).json({ error: 'inputs, results is required' });
    }

    const { rows } = await pool.query<SavedScenarioRow>(
      `INSERT INTO saved_scenarios (input_json, results_json, weather_json)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [JSON.stringify(inputs), JSON.stringify(results), JSON.stringify(weather || {})]
    );

    res.status(201).json(toScenarioDto(rows[0]));
  } catch (err) {
    next(err);
  }
});

export default router;
