import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { runPolicySimulation, judgePolicy, findAlternative } from '../engine/policyEngine';
import { requireAuth } from '../middleware/auth';
import { PolicyInputs, SimulateRequestBody } from '../types';

const router = express.Router();

const BUDGET_CSV_PATH = path.join(__dirname, '..', 'data', 'bus_budget.csv');

const getBaseBusCostYear = (): number => {
  const text = fs.readFileSync(BUDGET_CSV_PATH, 'utf-8');
  const rows = text.trim().split(/\r?\n/).slice(1);
  const row2024 = rows.find((line) => line.startsWith('2024,'));
  if (!row2024) return 120000000000;
  const value = Number(row2024.split(',')[1]);
  return Number.isFinite(value) ? value : 120000000000;
};

const DEFAULT_INPUTS: Omit<PolicyInputs, 'baseBusCostYear'> = {
  tramHeadway: 6,
  busCut: 20,
  passengerPeak: 2500,
  costPerTramRun: 3500000,
  operationHours: 18
};

router.get('/defaults', requireAuth, (req: Request, res: Response) => {
  res.json({ ...DEFAULT_INPUTS, baseBusCostYear: getBaseBusCostYear() });
});

// 정책 시뮬레이션 실행은 관제 담당자만 가능하다 (시민 공개 대상 아님).
router.post('/', requireAuth, (req: Request<unknown, unknown, SimulateRequestBody>, res: Response) => {
  const { inputs, weather } = req.body || {};
  if (!inputs) return res.status(400).json({ error: 'inputs is required' });

  const results = runPolicySimulation(inputs, weather);
  const judgement = judgePolicy(results, weather);
  res.json({ results, judgement });
});

router.post('/alternative', requireAuth, (req: Request<unknown, unknown, SimulateRequestBody>, res: Response) => {
  const { inputs, weather } = req.body || {};
  if (!inputs) return res.status(400).json({ error: 'inputs is required' });

  const alternative = findAlternative(inputs, weather);
  res.json(alternative);
});

export default router;
