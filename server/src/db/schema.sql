CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  transfer_type TEXT,
  base_passengers INTEGER NOT NULL DEFAULT 0,
  is_shared INTEGER NOT NULL DEFAULT 0,
  commercial_score INTEGER NOT NULL DEFAULT 0,
  area_type TEXT NOT NULL DEFAULT 'residential',
  prediction_base INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS simulation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  input_json TEXT NOT NULL,
  results_json TEXT NOT NULL,
  judgement_status TEXT NOT NULL,
  judgement_comment TEXT NOT NULL,
  report_summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  input_json TEXT NOT NULL,
  results_json TEXT NOT NULL,
  weather_json TEXT NOT NULL
);
