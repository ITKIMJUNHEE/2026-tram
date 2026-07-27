import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, LogOut, MapPin, History, Save, Database,
  ExternalLink, GitBranch, BarChart3, Brain, RefreshCw, AlertTriangle
} from 'lucide-react';
import {
  getAdminOverview, getAdminLinks, getAdminLogs, getAdminScenarios, getMlModelInfo,
  setAuthToken, getAuthToken, ApiError
} from './api/client';
import {
  AdminOverviewResponse, AdminLinksResponse, MlModelInfoResponse,
  SimulationLogDto, SavedScenarioDto
} from './types/api';

const PAGE_SIZE = 20;

const formatDateTime = (iso: string): string => new Date(iso).toLocaleString('ko-KR');

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [links, setLinks] = useState<AdminLinksResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<MlModelInfoResponse | null>(null);
  const [modelInfoError, setModelInfoError] = useState<string | null>(null);

  const [logs, setLogs] = useState<SimulationLogDto[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsOffset, setLogsOffset] = useState(0);

  const [scenarios, setScenarios] = useState<SavedScenarioDto[]>([]);
  const [scenariosTotal, setScenariosTotal] = useState(0);
  const [scenariosOffset, setScenariosOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    setAuthToken(null);
    navigate('/');
  }, [navigate]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setFatalError(null);
    try {
      const [overviewRes, linksRes, logsRes, scenariosRes] = await Promise.all([
        getAdminOverview(),
        getAdminLinks(),
        getAdminLogs(PAGE_SIZE, 0),
        getAdminScenarios(PAGE_SIZE, 0)
      ]);
      setOverview(overviewRes);
      setLinks(linksRes);
      setLogs(logsRes.items);
      setLogsTotal(logsRes.total);
      setLogsOffset(logsRes.items.length);
      setScenarios(scenariosRes.items);
      setScenariosTotal(scenariosRes.total);
      setScenariosOffset(scenariosRes.items.length);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return handleUnauthorized();
      setFatalError('대시보드 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }

    // ML 서비스는 별도로 호출한다 — 죽어있어도 나머지 대시보드는 정상 표시되어야 하므로
    // 이 실패가 위 Promise.all과 함께 묶여서 전체 로딩을 실패시키면 안 된다.
    try {
      const info = await getMlModelInfo();
      setModelInfo(info);
      setModelInfoError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return handleUnauthorized();
      setModelInfo(null);
      setModelInfoError('ML 서비스에 연결할 수 없습니다.');
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/');
      return;
    }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMoreLogs = async () => {
    try {
      const res = await getAdminLogs(PAGE_SIZE, logsOffset);
      setLogs((prev) => [...prev, ...res.items]);
      setLogsOffset((prev) => prev + res.items.length);
      setLogsTotal(res.total);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) handleUnauthorized();
    }
  };

  const handleLoadMoreScenarios = async () => {
    try {
      const res = await getAdminScenarios(PAGE_SIZE, scenariosOffset);
      setScenarios((prev) => [...prev, ...res.items]);
      setScenariosOffset((prev) => prev + res.items.length);
      setScenariosTotal(res.total);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) handleUnauthorized();
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600 font-bold text-xl">
        관리자 대시보드 불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-6">
      {/* 헤더 */}
      <header className="flex justify-between items-center mb-6">
        <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg"><ShieldCheck size={20} /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">관리자 대시보드</h1>
            <span className="text-[10px] font-bold text-blue-600 tracking-widest">ADMIN CONSOLE</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-5 py-3 rounded-xl font-bold shadow-md transition-all"
        >
          <LogOut size={18} /> 로그아웃
        </button>
      </header>

      {fatalError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold flex items-center gap-2">
          <AlertTriangle size={18} /> {fatalError}
          <button onClick={loadDashboard} className="ml-auto flex items-center gap-1 text-sm underline">
            <RefreshCw size={14} /> 다시 시도
          </button>
        </div>
      )}

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-2"><MapPin size={14} /> 정거장 수</div>
          <div className="text-3xl font-black text-slate-900">{overview?.stationCount ?? '-'}</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-2"><History size={14} /> 시뮬레이션 로그</div>
          <div className="text-3xl font-black text-slate-900">{overview?.simulationLogCount ?? '-'}</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-2"><Save size={14} /> 저장된 시나리오</div>
          <div className="text-3xl font-black text-slate-900">{overview?.savedScenarioCount ?? '-'}</div>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-2"><Database size={14} /> DB 상태</div>
          <div className={`text-lg font-black ${overview?.dbStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
            {overview?.dbStatus === 'connected' ? '● 정상 연결' : '● 연결 안 됨'}
          </div>
        </div>
      </div>

      {/* 인프라 도구 */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-500 mb-3 tracking-wide">인프라 도구</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={links?.argocdUrl} target="_blank" rel="noopener noreferrer"
            className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-5 flex items-center gap-4 hover:-translate-y-1 transition-all"
          >
            <div className="bg-indigo-600 text-white p-3 rounded-xl"><GitBranch size={22} /></div>
            <div className="flex-1">
              <div className="font-bold text-slate-900">ArgoCD</div>
              <div className="text-xs text-slate-500">배포 상태 확인</div>
            </div>
            <ExternalLink size={16} className="text-slate-400" />
          </a>
          <a
            href={links?.grafanaUrl} target="_blank" rel="noopener noreferrer"
            className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-5 flex items-center gap-4 hover:-translate-y-1 transition-all"
          >
            <div className="bg-orange-500 text-white p-3 rounded-xl"><BarChart3 size={22} /></div>
            <div className="flex-1">
              <div className="font-bold text-slate-900">Grafana</div>
              <div className="text-xs text-slate-500">메트릭/모니터링 확인</div>
            </div>
            <ExternalLink size={16} className="text-slate-400" />
          </a>
        </div>
      </section>

      {/* ML 모델 정보 */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-500 mb-3 tracking-wide">ML 모델 정보</h2>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-5">
          {modelInfoError ? (
            <div className="flex items-center gap-2 text-amber-600 font-bold">
              <AlertTriangle size={18} /> {modelInfoError}
            </div>
          ) : modelInfo ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><Brain size={12} /> 모델</div>
                <div className="font-bold text-slate-900">{modelInfo.model_type}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-bold mb-1">학습 데이터</div>
                <div className="font-bold text-slate-900">
                  {modelInfo.training_rows.toLocaleString()}건
                  <span className="text-xs text-slate-400 font-medium"> (합성 {modelInfo.synthetic_rows.toLocaleString()} / 실제 {modelInfo.real_rows.toLocaleString()})</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-bold mb-1">MAE / R²</div>
                <div className="font-bold text-slate-900">{modelInfo.mae.toLocaleString()} / {modelInfo.r2.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-bold mb-1">학습 시점</div>
                <div className="font-bold text-slate-900">{formatDateTime(modelInfo.trained_at)}</div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400">모델 정보가 없습니다.</div>
          )}
        </div>
      </section>

      {/* 최근 시뮬레이션 로그 */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-500 mb-3 tracking-wide">최근 시뮬레이션 로그 ({logsTotal}건)</h2>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">시간</th>
                <th className="text-left px-4 py-3">입력</th>
                <th className="text-left px-4 py-3">판정</th>
                <th className="text-left px-4 py-3">요약</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={4} className="text-center text-slate-400 py-6">기록이 없습니다.</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">{log.input}</td>
                  <td className="px-4 py-3">{log.judgementStatus}</td>
                  <td className="px-4 py-3 text-slate-600">{log.reportSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length < logsTotal && (
            <div className="p-3 text-center border-t border-slate-100">
              <button onClick={handleLoadMoreLogs} className="text-blue-600 font-bold text-sm hover:underline">더보기</button>
            </div>
          )}
        </div>
      </section>

      {/* 저장된 시나리오 */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-500 mb-3 tracking-wide">저장된 시나리오 ({scenariosTotal}건)</h2>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">시간</th>
                <th className="text-left px-4 py-3">배차</th>
                <th className="text-left px-4 py-3">감축</th>
                <th className="text-left px-4 py-3">날씨</th>
                <th className="text-left px-4 py-3">예산</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-400 py-6">저장된 시나리오가 없습니다.</td></tr>
              )}
              {scenarios.map((sc) => (
                <tr key={sc.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(sc.createdAt)}</td>
                  <td className="px-4 py-3">{sc.inputs.tramHeadway}분</td>
                  <td className="px-4 py-3">{sc.inputs.busCut}%</td>
                  <td className="px-4 py-3">{sc.weather?.type ?? '-'}</td>
                  <td className="px-4 py-3">{Math.round(sc.results.totalBudget / 100000000).toLocaleString()}억</td>
                </tr>
              ))}
            </tbody>
          </table>
          {scenarios.length < scenariosTotal && (
            <div className="p-3 text-center border-t border-slate-100">
              <button onClick={handleLoadMoreScenarios} className="text-blue-600 font-bold text-sm hover:underline">더보기</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
