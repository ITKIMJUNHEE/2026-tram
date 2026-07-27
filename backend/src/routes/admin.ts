import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import {
  SimulationLogRow,
  SimulationLogDto,
  SavedScenarioRow,
  SavedScenarioDto,
  AdminOverviewResponse,
  PaginatedResponse,
  AdminLinksResponse,
  MlModelInfoResponse
} from '../types';

const router = express.Router();

// 이 라우터의 모든 엔드포인트는 관리자 인증이 필요하다.
router.use(requireAuth);

const toLogDto = (row: SimulationLogRow): SimulationLogDto => ({
  id: row.id,
  createdAt: row.created_at,
  input: row.input_json,
  results: row.results_json,
  judgementStatus: row.judgement_status,
  judgementComment: row.judgement_comment,
  reportSummary: row.report_summary
});

const toScenarioDto = (row: SavedScenarioRow): SavedScenarioDto => ({
  id: row.id,
  createdAt: row.created_at,
  inputs: row.input_json,
  results: row.results_json,
  weather: row.weather_json
});

const parsePagination = (req: Request): { limit: number; offset: number } => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return { limit, offset };
};

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const [stations, logs, scenarios] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM stations'),
      pool.query('SELECT COUNT(*) FROM simulation_logs'),
      pool.query('SELECT COUNT(*) FROM saved_scenarios')
    ]);

    const overview: AdminOverviewResponse = {
      stationCount: Number(stations.rows[0].count),
      simulationLogCount: Number(logs.rows[0].count),
      savedScenarioCount: Number(scenarios.rows[0].count),
      dbStatus: 'connected'
    };
    res.json(overview);
  } catch (err) {
    // DB 조회 자체가 실패해도 500으로 죽이지 않고 dbStatus로 상태를 알려준다
    // (대시보드에서 "DB 연결 안 됨" 배지로 바로 보여줄 수 있도록).
    console.error('[admin/overview] DB 조회 실패:', err);
    const overview: AdminOverviewResponse = {
      stationCount: 0,
      simulationLogCount: 0,
      savedScenarioCount: 0,
      dbStatus: 'error'
    };
    res.json(overview);
  }
});

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePagination(req);
    const [rows, count] = await Promise.all([
      pool.query<SimulationLogRow>('SELECT * FROM simulation_logs ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM simulation_logs')
    ]);

    const response: PaginatedResponse<SimulationLogDto> = {
      items: rows.rows.map(toLogDto),
      total: Number(count.rows[0].count),
      limit,
      offset
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/scenarios', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePagination(req);
    const [rows, count] = await Promise.all([
      pool.query<SavedScenarioRow>('SELECT * FROM saved_scenarios ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) FROM saved_scenarios')
    ]);

    const response: PaginatedResponse<SavedScenarioDto> = {
      items: rows.rows.map(toScenarioDto),
      total: Number(count.rows[0].count),
      limit,
      offset
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/ml-model-info', async (req: Request, res: Response) => {
  const mlServiceUrl = process.env.ML_SERVICE_URL;
  if (!mlServiceUrl) {
    return res.status(503).json({ error: 'ML_SERVICE_URL이 설정되지 않았습니다.' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${mlServiceUrl}/model-info`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(503).json({ error: `ML 서비스 응답 오류 (status=${response.status})` });
    }

    const data = (await response.json()) as MlModelInfoResponse;
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[admin/ml-model-info] ML 서비스 연결 실패:', message);
    res.status(503).json({ error: 'ML 서비스에 연결할 수 없습니다.' });
  }
});

router.get('/links', (req: Request, res: Response) => {
  const links: AdminLinksResponse = {
    argocdUrl: process.env.ARGOCD_URL || 'https://argocd.oasis-tram.duckdns.org',
    grafanaUrl: process.env.GRAFANA_URL || 'https://grafana.oasis-tram.duckdns.org'
  };
  res.json(links);
});

export default router;
