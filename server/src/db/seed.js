const fs = require('fs');
const path = require('path');
const { pool, ensureSchema } = require('./connection');

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

async function seedStations() {
  const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
  const stationMeta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
  const rows = parseStationsCsv(csvText);

  const merged = rows.map((row) => {
    const meta = stationMeta[row.station_id] || {};
    return {
      id: Number(row.station_id),
      name: row.station_name,
      lat: Number(row.lat),
      lon: Number(row.lon),
      transfer_type: row.transfer_type || null,
      base_passengers: Number(row.base_passengers) || 0,
      is_shared: String(row.is_shared).toLowerCase() === 'true',
      commercial_score: meta.commercialScore ?? 0,
      area_type: meta.areaType ?? 'residential',
      prediction_base: meta.predictionBase ?? (Number(row.base_passengers) || 0)
    };
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const st of merged) {
      await client.query(
        `INSERT INTO stations
           (id, name, lat, lon, transfer_type, base_passengers, is_shared, commercial_score, area_type, prediction_base)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           lat = EXCLUDED.lat,
           lon = EXCLUDED.lon,
           transfer_type = EXCLUDED.transfer_type,
           base_passengers = EXCLUDED.base_passengers,
           is_shared = EXCLUDED.is_shared,
           commercial_score = EXCLUDED.commercial_score,
           area_type = EXCLUDED.area_type,
           prediction_base = EXCLUDED.prediction_base`,
        [
          st.id,
          st.name,
          st.lat,
          st.lon,
          st.transfer_type,
          st.base_passengers,
          st.is_shared,
          st.commercial_score,
          st.area_type,
          st.prediction_base
        ]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`[seed] ${merged.length}개 정거장 데이터 시딩 완료`);
}

async function main() {
  await ensureSchema();
  await seedStations();
  await pool.end();
}

main().catch((err) => {
  console.error('[seed] 시딩 실패:', err);
  process.exit(1);
});
