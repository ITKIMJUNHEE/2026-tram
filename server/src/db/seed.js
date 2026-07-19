const fs = require('fs');
const path = require('path');
const db = require('./connection');

const CSV_PATH = path.join(__dirname, '..', 'data', 'tram_stations.csv');
const META_PATH = path.join(__dirname, '..', 'data', 'stationMeta.json');

function parseStationsCsv(csvText) {
  const [headerLine, ...lines] = csvText.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.filter(Boolean).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
}

function seedStations() {
  const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
  const stationMeta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
  const rows = parseStationsCsv(csvText);

  const insert = db.prepare(`
    INSERT INTO stations
      (id, name, lat, lon, transfer_type, base_passengers, is_shared, commercial_score, area_type, prediction_base)
    VALUES
      (@id, @name, @lat, @lon, @transfer_type, @base_passengers, @is_shared, @commercial_score, @area_type, @prediction_base)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      lat = excluded.lat,
      lon = excluded.lon,
      transfer_type = excluded.transfer_type,
      base_passengers = excluded.base_passengers,
      is_shared = excluded.is_shared,
      commercial_score = excluded.commercial_score,
      area_type = excluded.area_type,
      prediction_base = excluded.prediction_base
  `);

  const insertAll = (stations) => {
    db.exec('BEGIN');
    try {
      for (const st of stations) insert.run(st);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };

  const merged = rows.map((row) => {
    const meta = stationMeta[row.station_id] || {};
    return {
      id: Number(row.station_id),
      name: row.station_name,
      lat: Number(row.lat),
      lon: Number(row.lon),
      transfer_type: row.transfer_type || null,
      base_passengers: Number(row.base_passengers) || 0,
      is_shared: String(row.is_shared).toLowerCase() === 'true' ? 1 : 0,
      commercial_score: meta.commercialScore ?? 0,
      area_type: meta.areaType ?? 'residential',
      prediction_base: meta.predictionBase ?? (Number(row.base_passengers) || 0)
    };
  });

  insertAll(merged);
  console.log(`[seed] ${merged.length}개 정거장 데이터 시딩 완료`);
}

seedStations();
