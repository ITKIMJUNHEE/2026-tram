import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { StationRow, StationDto } from '../types';

const router = express.Router();

const toStationDto = (row: StationRow): StationDto => ({
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

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query<StationRow>('SELECT * FROM stations ORDER BY id');
    res.json(rows.map(toStationDto));
  } catch (err) {
    next(err);
  }
});

export default router;
