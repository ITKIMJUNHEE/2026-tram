CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  transfer_type TEXT,
  base_passengers INTEGER NOT NULL DEFAULT 0,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  commercial_score INTEGER NOT NULL DEFAULT 0,
  area_type TEXT NOT NULL DEFAULT 'residential',
  prediction_base INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS simulation_logs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  input_json JSONB NOT NULL,
  results_json JSONB NOT NULL,
  judgement_status TEXT NOT NULL,
  judgement_comment TEXT NOT NULL,
  report_summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_scenarios (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  input_json JSONB NOT NULL,
  results_json JSONB NOT NULL,
  weather_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
