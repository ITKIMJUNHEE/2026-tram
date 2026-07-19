require('./db/connection'); // 앱 시작 시 스키마 보장

const express = require('express');
const cors = require('cors');

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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/stations', stationsRouter);
app.use('/api/simulate', simulateRouter);
app.use('/api/predict', predictRouter);
app.use('/api/logs', logsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/weather', weatherRouter);

app.listen(PORT, () => {
  console.log(`[server] 대전 트램 시뮬레이션 API가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
