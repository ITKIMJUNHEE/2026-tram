const express = require('express');
const fs = require('fs');
const path = require('path');
const { runPolicySimulation, judgePolicy, findAlternative } = require('../engine/policyEngine');

const router = express.Router();

const BUDGET_CSV_PATH = path.join(__dirname, '..', 'data', 'bus_budget.csv');

const getBaseBusCostYear = () => {
  const text = fs.readFileSync(BUDGET_CSV_PATH, 'utf-8');
  const rows = text.trim().split(/\r?\n/).slice(1);
  const row2024 = rows.find((line) => line.startsWith('2024,'));
  if (!row2024) return 120000000000;
  const value = Number(row2024.split(',')[1]);
  return Number.isFinite(value) ? value : 120000000000;
};

const DEFAULT_INPUTS = {
  tramHeadway: 6,
  busCut: 20,
  passengerPeak: 2500,
  costPerTramRun: 3500000,
  operationHours: 18
};

router.get('/defaults', (req, res) => {
  res.json({ ...DEFAULT_INPUTS, baseBusCostYear: getBaseBusCostYear() });
});

router.post('/', (req, res) => {
  const { inputs, weather } = req.body || {};
  if (!inputs) return res.status(400).json({ error: 'inputs is required' });

  const results = runPolicySimulation(inputs, weather);
  const judgement = judgePolicy(results, weather);
  res.json({ results, judgement });
});

router.post('/alternative', (req, res) => {
  const { inputs, weather } = req.body || {};
  if (!inputs) return res.status(400).json({ error: 'inputs is required' });

  const alternative = findAlternative(inputs, weather);
  res.json(alternative);
});

module.exports = router;
