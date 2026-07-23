/**
 * backend/src/types/index.ts의 API 응답/요청 타입을 복제 정의한 것.
 * 모노레포가 아니라 별도 npm 패키지(frontend/backend)라 직접 import는 안 되고,
 * 여기서 동일한 구조로 다시 선언해 타입 불일치를 방지한다.
 *
 * 주의: backend 타입은 pg가 반환하는 서버측 값(예: createdAt: Date) 기준이지만,
 * 이 값들은 express의 res.json()을 거쳐 HTTP로 전달되며 JSON에는 Date 타입이 없어
 * ISO 문자열로 직렬화된다. 그래서 여기서는 createdAt을 string으로 선언한다.
 */

export interface WeatherCondition {
  type: 'sunny' | 'rain' | 'snow';
  intensity: number;
}

/* -------------------------------------------------------------------------- */
/* stations                                                                    */
/* -------------------------------------------------------------------------- */

export interface StationDto {
  id: number;
  name: string;
  lat: number;
  lon: number;
  transferType: string | null;
  basePassengers: number;
  isShared: boolean;
  commercialScore: number;
  areaType: string;
  predictionBase: number;
}

/* -------------------------------------------------------------------------- */
/* 정책 시뮬레이션 (simulate)                                                  */
/* -------------------------------------------------------------------------- */

export interface PolicyInputs {
  tramHeadway: number;
  busCut: number;
  passengerPeak: number;
  costPerTramRun: number;
  baseBusCostYear: number;
  operationHours: number;
}

export interface CongestionInfo {
  text: string;
  tagClass: string;
  color: string;
}

export interface ComplaintInfo {
  text: string;
  class1: string;
  tag1: string;
}

export interface BudgetTag {
  text: string;
  class: string;
}

export interface StrategyProposal {
  title: string;
  actionItems: string[];
  tone: 'danger' | 'negative' | 'positive' | 'neutral';
}

export interface PolicySimulationResult {
  tramRunsPerDay: number;
  tramCostYear: number;
  busCostYear: number;
  totalBudget: number;
  deltaBudget: number;
  budgetChangePercent: number;
  congestionPercent: number;
  congestionInfo: CongestionInfo;
  complaintScore: number;
  complaintInfo: ComplaintInfo;
  strategyProposal: StrategyProposal;
  budgetTag: BudgetTag;
  effectiveHeadway: number;
  speedFactor: number;
  co2Reduction: number;
  pineTrees: number;
  carReduction: number;
  headwayWeekend: number;
  headwayPeak: number;
}

export interface PolicyJudgement {
  status: string;
  comment: string;
  color: 'yellow' | 'red' | 'green';
  isRecommended: boolean;
}

export interface SimulateResponse {
  results: PolicySimulationResult;
  judgement: PolicyJudgement;
}

export interface AlternativeScenario {
  input: { tramHeadway: number; busCut: number };
  results: PolicySimulationResult;
  judgement: PolicyJudgement;
}

export type AlternativeSearchResult =
  | ({ found: true } & AlternativeScenario)
  | { found: false; message: string };

export interface SimulateDefaults extends PolicyInputs {}

/* -------------------------------------------------------------------------- */
/* 예측 (predict)                                                             */
/* -------------------------------------------------------------------------- */

/** lon은 실제로 존재하지 않는 필드지만 TramPredictionMap이 `st.lon ?? st.lng`로
 * 방어적으로 조회하므로(항상 undefined) 그 조회 로직을 그대로 지원하기 위해 optional로 둔다. */
export interface PredictionStationResult {
  id: number;
  name: string;
  lat: number;
  lng: number;
  lon?: number;
  base: number;
  shared: boolean;
  commercialScore: number;
  type: string;
  congestion: number;
  passengers: number;
}

/** data/bus/data_<month>.json 원본 항목. lat/lng 외 표기가 통일돼있지 않아
 * TramPredictionMap이 lon/long/longitude를 순서대로 방어적으로 조회하므로,
 * 실제 존재하지 않는 필드도 optional로 함께 선언해 그 조회 로직을 그대로 지원한다. */
export interface BusDataItem {
  name: string;
  lat: number | string;
  lng?: number | string;
  lon?: number | string;
  long?: number | string;
  longitude?: number | string;
  passengers: number;
  nearest_tram_id?: number | string;
}

export interface PredictResponse {
  results: PredictionSimulationResult;
  busStops: BusDataItem[];
  weather: WeatherCondition;
}

export interface PredictionSimulationResult {
  budget: number;
  congestion: number;
  complaintRisk: string;
  complaintMsg: string;
  stations: PredictionStationResult[];
  waitTime: string;
  carsReduced: number;
}

export interface PredictRequestParams {
  tramInterval: number;
  busReduction: number;
  signalLevel?: number;
  isAiMode?: boolean;
  timeSlot?: string;
  month?: number;
}

/* -------------------------------------------------------------------------- */
/* 정책 결정 로그 (logs)                                                       */
/* -------------------------------------------------------------------------- */

/** input/results는 구조화된 객체가 아니라 TramSimulation이 만드는 사람이 읽는
 * 요약 문자열이다 (예: "배차 6분 / 감축 20%"). backend의 SimulationLogDto와 동일. */
export interface SimulationLogDto {
  id: number;
  createdAt: string;
  input: string;
  results: string;
  judgementStatus: string;
  judgementComment: string;
  reportSummary: string;
}

export interface CreateSimulationLogBody {
  input: string;
  results: string;
  judgementStatus: string;
  judgementComment?: string;
  reportSummary?: string;
}

/* -------------------------------------------------------------------------- */
/* 저장된 시나리오 (scenarios)                                                 */
/* -------------------------------------------------------------------------- */

export interface SavedScenarioDto {
  id: number;
  createdAt: string;
  inputs: PolicyInputs;
  results: PolicySimulationResult;
  weather: WeatherCondition;
}

export interface CreateSavedScenarioBody {
  inputs: PolicyInputs;
  results: PolicySimulationResult;
  weather?: WeatherCondition;
}

/* -------------------------------------------------------------------------- */
/* 날씨 (weather)                                                             */
/* -------------------------------------------------------------------------- */

export interface WeatherApiResponse {
  temp: number;
  desc: string;
  icon: string;
}
