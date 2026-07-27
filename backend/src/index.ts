import express from 'express';
import cors from 'cors';
import { ensureSchema } from './db/connection';
import { register, metricsMiddleware } from './metrics';

import stationsRouter from './routes/stations';
import simulateRouter from './routes/simulate';
import predictRouter from './routes/predict';
import logsRouter from './routes/logs';
import scenariosRouter from './routes/scenarios';
import weatherRouter from './routes/weather';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';

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
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

async function main(): Promise<void> {
  await ensureSchema();
  app.listen(PORT, () => {
    console.log(`[server] 대전 트램 시뮬레이션 API가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
}

main().catch((err) => {
  console.error('[server] 서버 시작 실패:', err);
  process.exit(1);
});
