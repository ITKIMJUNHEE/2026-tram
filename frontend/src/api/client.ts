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
  WeatherCondition
} from '../types/api';

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API 요청 실패 (${response.status}): ${text}`);
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
