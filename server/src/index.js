const express = require('express');
const cors = require('cors');
const { ensureSchema } = require('./db/connection');
const { register, metricsMiddleware } = require('./metrics');

const stationsRouter = require('./routes/stations');
const simulateRouter = require('./routes/simulate');
const predictRouter = require('./routes/predict');
const logsRouter = require('./routes/logs');
const scenariosRouter = require('./routes/scenarios');
const weatherRouter = require('./routes/weather');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/stations', stationsRouter);
app.use('/api/simulate', simulateRouter);
app.use('/api/predict', predictRouter);
app.use('/api/logs', logsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/weather', weatherRouter);

async function main() {
  await ensureSchema();
  app.listen(PORT, () => {
    console.log(`[server] 대전 트램 시뮬레이션 API가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
}

main().catch((err) => {
  console.error('[server] 서버 시작 실패:', err);
  process.exit(1);
});
