import {
  StationDto,
  SimulateDefaults,
  SimulateResponse,
  AlternativeSearchResult,
  PredictRequestParams,
  PredictResponse,
  BusDataItem,
  SimulationLogDto,
  CreateSimulationLogBody,
  SavedScenarioDto,
  CreateSavedScenarioBody,
  WeatherApiResponse,
  PolicyInputs,
  WeatherCondition,
  LoginResponse,
  AdminOverviewResponse,
  AdminLinksResponse,
  MlModelInfoResponse,
  PaginatedResponse
} from '../types/api';

// 응답 상태 코드를 들고 있어서, 호출부에서 401(세션 만료)만 골라 로그인 페이지로
// 리다이렉트하는 등 상태별로 다르게 처리할 수 있게 한다.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const AUTH_TOKEN_STORAGE_KEY = 'authToken';

// 메모리 상태가 우선이고, sessionStorage는 새로고침해도 로그인이 풀리지 않도록 보조로만 쓴다
// (localStorage처럼 브라우저를 닫아도 남아있진 않음).
let authToken: string | null = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

export const setAuthToken = (token: string | null): void => {
  authToken = token;
  if (token) {
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

export const getAuthToken = (): string | null => authToken;

// 관리자 API 호출 시 재사용할 Authorization 헤더 유틸.
const authHeaders = (): Record<string, string> => (authToken ? { Authorization: `Bearer ${authToken}` } : {});

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...options
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(response.status, `API 요청 실패 (${response.status}): ${text}`);
  }
  return response.json();
};

export const getStations = (): Promise<StationDto[]> => request('/stations');

export const getSimulateDefaults = (): Promise<SimulateDefaults> => request('/simulate/defaults');

export const runSimulate = (inputs: PolicyInputs, weather?: WeatherCondition): Promise<SimulateResponse> =>
  request('/simulate', { method: 'POST', body: JSON.stringify({ inputs, weather }) });

export const runSimulateAlternative = (inputs: PolicyInputs, weather?: WeatherCondition): Promise<AlternativeSearchResult> =>
  request('/simulate/alternative', { method: 'POST', body: JSON.stringify({ inputs, weather }) });

export const runPredict = (params: PredictRequestParams): Promise<PredictResponse> =>
  request('/predict', { method: 'POST', body: JSON.stringify(params) });

export const getBusDataForMonth = (month: number): Promise<BusDataItem[]> => request(`/predict/bus-data/${month}`);

export const getLogs = (): Promise<SimulationLogDto[]> => request('/logs');

export const createLog = (log: CreateSimulationLogBody): Promise<SimulationLogDto> =>
  request('/logs', { method: 'POST', body: JSON.stringify(log) });

export const getScenarios = (): Promise<SavedScenarioDto[]> => request('/scenarios');

export const saveScenario = (scenario: CreateSavedScenarioBody): Promise<SavedScenarioDto> =>
  request('/scenarios', { method: 'POST', body: JSON.stringify(scenario) });

export const getWeather = (): Promise<WeatherApiResponse> => request('/weather');

export const login = (username: string, password: string): Promise<LoginResponse> =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const getAdminOverview = (): Promise<AdminOverviewResponse> => request('/admin/overview');

export const getAdminLogs = (limit: number, offset: number): Promise<PaginatedResponse<SimulationLogDto>> =>
  request(`/admin/logs?limit=${limit}&offset=${offset}`);

export const getAdminScenarios = (limit: number, offset: number): Promise<PaginatedResponse<SavedScenarioDto>> =>
  request(`/admin/scenarios?limit=${limit}&offset=${offset}`);

export const getAdminLinks = (): Promise<AdminLinksResponse> => request('/admin/links');

export const getMlModelInfo = (): Promise<MlModelInfoResponse> => request('/admin/ml-model-info');
