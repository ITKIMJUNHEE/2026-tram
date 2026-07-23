/** 날씨 조건 (정책/예측 엔진 공통 입력) */
export interface WeatherCondition {
  type: 'sunny' | 'rain' | 'snow';
  intensity: number;
}

/* -------------------------------------------------------------------------- */
/* stations 테이블                                                            */
/* -------------------------------------------------------------------------- */

/** stations 테이블 로우 (schema.sql 기준, snake_case) */
export interface StationRow {
  id: number;
  name: string;
  lat: number;
  lon: number;
  transfer_type: string | null;
  base_passengers: number;
  is_shared: boolean;
  commercial_score: number;
  area_type: string;
  prediction_base: number;
}

/** GET /api/stations 응답 DTO (camelCase) */
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
/* 정책 시뮬레이션 엔진 (engine/policyEngine)                                  */
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

export interface AlternativeScenario {
  input: { tramHeadway: number; busCut: number };
  results: PolicySimulationResult;
  judgement: PolicyJudgement;
}

export type AlternativeSearchResult =
  | ({ found: true } & AlternativeScenario)
  | { found: false; message: string };

/* -------------------------------------------------------------------------- */
/* 예측 엔진 (engine/predictionEngine)                                        */
/* -------------------------------------------------------------------------- */

/** predictionEngine에 주입되는 정거장 형태 (stations 테이블 로우를 매핑) */
export interface PredictionStationInput {
  id: number;
  name: string;
  lat: number;
  lng: number;
  base: number;
  shared: boolean;
  commercialScore: number;
  type: string;
}

/** 예측 결과에 congestion/passengers가 추가된 정거장 */
export interface PredictionStationResult extends PredictionStationInput {
  congestion: number;
  passengers: number;
}

/** data/bus/data_<month>.json 원본 항목. nearest_tram_id는 원본 데이터셋에 실제로는 없는
 * 필드라 항상 undefined로 평가되며(기존 프론트엔드와 동일한 동작), 타입만 optional로 반영한다. */
export interface BusDataItem {
  name: string;
  lat: number;
  lng: number;
  passengers: number;
  nearest_tram_id?: number | string;
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

/* -------------------------------------------------------------------------- */
/* simulation_logs 테이블                                                     */
/* -------------------------------------------------------------------------- */

/** input_json/results_json은 구조화된 객체가 아니라 프론트엔드(TramSimulation.jsx의
 * handleAcceptPolicy)가 만들어 보내는 사람이 읽는 요약 문자열이다 (예: "배차 6분 / 감축 20%").
 * DecisionLog 컴포넌트가 그대로 텍스트로 렌더링하는 것에서도 문자열임이 확인된다. */
export interface SimulationLogRow {
  id: number;
  created_at: Date;
  input_json: string;
  results_json: string;
  judgement_status: string;
  judgement_comment: string;
  report_summary: string;
}

export interface SimulationLogDto {
  id: number;
  createdAt: Date;
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
/* saved_scenarios 테이블                                                     */
/* -------------------------------------------------------------------------- */

export interface SavedScenarioRow {
  id: number;
  created_at: Date;
  input_json: PolicyInputs;
  results_json: PolicySimulationResult;
  weather_json: WeatherCondition;
}

export interface SavedScenarioDto {
  id: number;
  createdAt: Date;
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
/* 라우트 요청 바디                                                            */
/* -------------------------------------------------------------------------- */

export interface SimulateRequestBody {
  inputs: PolicyInputs;
  weather?: WeatherCondition;
}

export interface PredictRequestBody {
  tramInterval: number;
  busReduction: number;
  signalLevel?: number;
  isAiMode?: boolean;
  timeSlot?: string;
  month?: number;
}

export interface WeatherApiResponse {
  temp: number;
  desc: string;
  icon: string;
}

/** POST /api/predict/ml 요청 바디. ml-service의 /predict 스키마와 동일하게 맞춘다. */
export interface MlPredictRequestBody {
  commercial_score: number;
  area_type: string;
  is_shared: boolean;
  base_passengers: number;
  day_type: string;
  time_slot: string;
  weather: string;
}

export interface MlPredictResponse {
  predicted_passengers: number;
  source?: 'rule-based-fallback';
}
