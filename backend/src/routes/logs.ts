import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { SimulationLogRow, SimulationLogDto, CreateSimulationLogBody } from '../types';

const router = express.Router();

// 정책 결정 로그는 관제 담당자만 조회/기록할 수 있다 (시민 공개 대상 아님).
router.use(requireAuth);

const toLogDto = (row: SimulationLogRow): SimulationLogDto => ({
  id: row.id,
  createdAt: row.created_at,
  input: row.input_json,
  results: row.results_json,
  judgementStatus: row.judgement_status,
  judgementComment: row.judgement_comment,
  reportSummary: row.report_summary
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query<SimulationLogRow>('SELECT * FROM simulation_logs ORDER BY id DESC');
    res.json(rows.map(toLogDto));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request<unknown, unknown, CreateSimulationLogBody>, res: Response, next: NextFunction) => {
  try {
    const { input, results, judgementStatus, judgementComment, reportSummary } = req.body || {};
    if (!input || !results || !judgementStatus) {
      return res.status(400).json({ error: 'input, results, judgementStatus is required' });
    }

    const { rows } = await pool.query<SimulationLogRow>(
      `INSERT INTO simulation_logs (input_json, results_json, judgement_status, judgement_comment, report_summary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        JSON.stringify(input),
        JSON.stringify(results),
        judgementStatus,
        judgementComment || '',
        reportSummary || ''
      ]
    );

    res.status(201).json(toLogDto(rows[0]));
  } catch (err) {
    next(err);
  }
});

export default router;
