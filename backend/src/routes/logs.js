const express = require('express');
const { pool } = require('../db/connection');

const router = express.Router();

const toLogDto = (row) => ({
  id: row.id,
  createdAt: row.created_at,
  input: row.input_json,
  results: row.results_json,
  judgementStatus: row.judgement_status,
  judgementComment: row.judgement_comment,
  reportSummary: row.report_summary
});

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM simulation_logs ORDER BY id DESC');
    res.json(rows.map(toLogDto));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { input, results, judgementStatus, judgementComment, reportSummary } = req.body || {};
    if (!input || !results || !judgementStatus) {
      return res.status(400).json({ error: 'input, results, judgementStatus is required' });
    }

    const { rows } = await pool.query(
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

module.exports = router;
