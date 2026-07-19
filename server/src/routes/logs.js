const express = require('express');
const db = require('../db/connection');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM simulation_logs ORDER BY id DESC').all();
  res.json(rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    input: JSON.parse(row.input_json),
    results: JSON.parse(row.results_json),
    judgementStatus: row.judgement_status,
    judgementComment: row.judgement_comment,
    reportSummary: row.report_summary
  })));
});

router.post('/', (req, res) => {
  const { input, results, judgementStatus, judgementComment, reportSummary } = req.body || {};
  if (!input || !results || !judgementStatus) {
    return res.status(400).json({ error: 'input, results, judgementStatus is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO simulation_logs (input_json, results_json, judgement_status, judgement_comment, report_summary)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    JSON.stringify(input),
    JSON.stringify(results),
    judgementStatus,
    judgementComment || '',
    reportSummary || ''
  );

  const row = db.prepare('SELECT * FROM simulation_logs WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({
    id: row.id,
    createdAt: row.created_at,
    input: JSON.parse(row.input_json),
    results: JSON.parse(row.results_json),
    judgementStatus: row.judgement_status,
    judgementComment: row.judgement_comment,
    reportSummary: row.report_summary
  });
});

module.exports = router;
