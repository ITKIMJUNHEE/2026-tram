const request = async (path, options = {}) => {
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

export const getStations = () => request('/stations');

export const getSimulateDefaults = () => request('/simulate/defaults');

export const runSimulate = (inputs, weather) =>
  request('/simulate', { method: 'POST', body: JSON.stringify({ inputs, weather }) });

export const runSimulateAlternative = (inputs, weather) =>
  request('/simulate/alternative', { method: 'POST', body: JSON.stringify({ inputs, weather }) });

export const runPredict = (params) =>
  request('/predict', { method: 'POST', body: JSON.stringify(params) });

export const getBusDataForMonth = (month) => request(`/predict/bus-data/${month}`);

export const getLogs = () => request('/logs');

export const createLog = (log) => request('/logs', { method: 'POST', body: JSON.stringify(log) });

export const getScenarios = () => request('/scenarios');

export const saveScenario = (scenario) =>
  request('/scenarios', { method: 'POST', body: JSON.stringify(scenario) });

export const getWeather = () => request('/weather');
