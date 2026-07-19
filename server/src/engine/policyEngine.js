/**
 * 정책 시뮬레이션 엔진 (배차 간격 / 버스 감축률 -> 예산·혼잡도·민원 위험 분석)
 * 기존 프론트엔드(TramSimulation.jsx)의 useMemo 계산 로직 + 구 simulationLogic.js의
 * judgePolicy/findAlternative 개념을 하나의 서버측 순수 함수 모듈로 통합한 것.
 */

const runPolicySimulation = (inputs, weather = { type: 'sunny', intensity: 0 }) => {
  const { tramHeadway, busCut, passengerPeak, costPerTramRun, baseBusCostYear, operationHours } = inputs;

  let speedFactor = 1.0;
  if (weather.type === 'rain') speedFactor = 1.0 - (weather.intensity / 100) * 0.4;
  else if (weather.type === 'snow') speedFactor = 1.0 - (weather.intensity / 100) * 0.6;
  speedFactor = Math.max(speedFactor, 0.3);

  const effectiveHeadway = tramHeadway / speedFactor;

  const runsWeekday = (operationHours * 60) / effectiveHeadway;
  const costWeekdayTotal = runsWeekday * 245 * costPerTramRun;
  const headwayWeekend = effectiveHeadway * 1.5;
  const runsWeekend = (operationHours * 60) / headwayWeekend;
  const costWeekendTotal = runsWeekend * 110 * costPerTramRun;
  const headwayPeak = effectiveHeadway * 0.8;
  const runsPeak = (operationHours * 60) / headwayPeak;
  const costPeakTotal = runsPeak * 10 * costPerTramRun;

  const tramCostYear = Math.round(costWeekdayTotal + costWeekendTotal + costPeakTotal);
  const tramRunsPerDay = Math.round(runsWeekday);

  const busCostYear = baseBusCostYear * (1 - busCut / 100);
  const totalBudget = tramCostYear + busCostYear;
  const deltaBudget = totalBudget - baseBusCostYear;
  const budgetChangePercent = (deltaBudget / baseBusCostYear) * 100;

  const MAX_CAPACITY_REFERENCE = 5000;
  const headwayPenalty = effectiveHeadway / 6;
  const adjustedPassengerLoad = passengerPeak * headwayPenalty;
  const rawCongestion = (adjustedPassengerLoad / MAX_CAPACITY_REFERENCE) * 100;
  const congestionPercent = Math.min(rawCongestion, 100);

  let rawComplaintScore = busCut * 1.0 + congestionPercent * 0.5;
  if (rawCongestion > 100) rawComplaintScore += 10;
  const complaintScore = Math.min(rawComplaintScore, 100);

  const dailyPassengers = passengerPeak * operationHours * 0.6;
  const co2Reduction = Math.round((dailyPassengers * 365 * 0.3 * 10 * 0.13) / 1000);
  const pineTrees = Math.round((co2Reduction * 1000) / 6.6);
  const carReduction = Math.round(dailyPassengers * 0.25);

  let congestionInfo;
  if (congestionPercent < 50) congestionInfo = { text: '여유 있음', tagClass: 'tag-success', color: '#22c55e' };
  else if (congestionPercent < 80) congestionInfo = { text: '적정 수준', tagClass: 'tag-info', color: '#3b82f6' };
  else if (congestionPercent < 99) congestionInfo = { text: '주의 필요', tagClass: 'tag-warning', color: '#f59e0b' };
  else congestionInfo = { text: '최대 수용 초과', tagClass: 'tag-danger', color: '#ef4444' };

  let complaintInfo;
  if (complaintScore <= 25) complaintInfo = { text: '낮음', class1: 'tag-success', tag1: '안정' };
  else if (complaintScore <= 50) complaintInfo = { text: '중간', class1: 'tag-warning', tag1: '주의' };
  else if (complaintScore <= 75) complaintInfo = { text: '높음', class1: 'tag-danger', tag1: '경고' };
  else complaintInfo = { text: '매우 높음', class1: 'tag-danger', tag1: '위험' };

  let budgetTag;
  if (deltaBudget < 0) budgetTag = { text: '예산 절감', class: 'tag-success' };
  else if (deltaBudget < baseBusCostYear * 0.15) budgetTag = { text: '소폭 증가', class: 'tag-info' };
  else budgetTag = { text: '예산 부담 증가', class: 'tag-warning' };

  const isBudgetOk = deltaBudget <= baseBusCostYear * 0.15;
  let strategyProposal;
  if (weather.type === 'snow') {
    const delayRatio = (effectiveHeadway / tramHeadway).toFixed(1);
    strategyProposal = {
      title: `❄️ 폭설 비상 대응 (적설량 ${weather.intensity}cm)`,
      actionItems: [`운행 속도 ${Math.round(speedFactor * 100)}%로 감속`, `실제 배차 ${effectiveHeadway.toFixed(1)}분 (${delayRatio}배 지연)`],
      tone: 'danger'
    };
  } else if (weather.type === 'rain') {
    const delayRatio = (effectiveHeadway / tramHeadway).toFixed(1);
    strategyProposal = {
      title: `🌧️ 호우 안전 대책 (강수량 ${weather.intensity}mm)`,
      actionItems: [`안전 감속 운행 중 (속도 ${Math.round(speedFactor * 100)}%)`, `실제 배차 ${effectiveHeadway.toFixed(1)}분 (${delayRatio}배 지연)`],
      tone: 'negative'
    };
  } else if (congestionPercent >= 100) {
    strategyProposal = {
      title: '🚨 수송 용량 포화',
      actionItems: [`배차 간격 ${Math.max(3, tramHeadway - 2)}분으로 즉시 단축`, '예비 차량 전량 투입'],
      tone: 'danger'
    };
  } else if (congestionPercent < 50) {
    strategyProposal = { title: '💸 운영 효율화 필요', actionItems: ['배차 간격 확대하여 예산 절감', '탄력 배차제 도입'], tone: 'negative' };
  } else if (isBudgetOk && congestionPercent >= 70 && congestionPercent <= 95) {
    strategyProposal = { title: '🌟 최적의 황금 정책', actionItems: ['현재 설정 유지 권장', '스마트 쉘터 구축 제안'], tone: 'positive' };
  } else if (deltaBudget > baseBusCostYear * 0.2) {
    strategyProposal = { title: '💰 예산 초과 경고', actionItems: ['버스 노선 추가 감축 검토', '운행 횟수 조정'], tone: 'negative' };
  } else {
    strategyProposal = { title: '⚖️ 정책 미세 조정 필요', actionItems: ['배차 간격 1~2분 조정 권장'], tone: 'neutral' };
  }

  return {
    tramRunsPerDay, tramCostYear, busCostYear, totalBudget, deltaBudget, budgetChangePercent,
    congestionPercent, congestionInfo,
    complaintScore: Number(complaintScore.toFixed(0)), complaintInfo,
    strategyProposal, budgetTag, effectiveHeadway, speedFactor,
    co2Reduction, pineTrees, carReduction,
    headwayWeekend, headwayPeak
  };
};

/**
 * 정책 판단 (🟢/🟡/🔴). 날씨 악화 시 별도 경고 상태를 우선 반환한다.
 */
const judgePolicy = (results, weather = { type: 'sunny', intensity: 0 }) => {
  const { congestionPercent, complaintScore, budgetChangePercent } = results;

  let status = '🟡 시범 적용 권장';
  let comment = '혼잡도 또는 민원 위험에 대해 추가 모니터링이 필요합니다.';
  let color = 'yellow';
  let isRecommended = false;

  if (weather.type !== 'sunny') {
    status = '⚠️ 기상 악화 주의';
    comment = '기상 악화로 인해 변동성이 큽니다. 보수적인 운영이 필요합니다.';
    color = 'yellow';
  } else if (congestionPercent >= 100) {
    status = '🔴 적용 비권장 (수용 초과)';
    comment = `🚨 혼잡도 ${congestionPercent.toFixed(0)}%로 수용 한계에 도달했습니다. 승객 탑승 불가 상황이 우려됩니다.`;
    color = 'red';
  } else if (complaintScore >= 60) {
    status = '🔴 적용 비권장 (민원 폭주)';
    comment = `🚨 민원 위험 점수 ${complaintScore}점으로 높음. 특히 버스 감축으로 인한 환승 민원이 우려됩니다.`;
    color = 'red';
  } else if (budgetChangePercent > 20) {
    status = '🟡 시범 적용 권장 (예산 주의)';
    comment = `💰 예산 증감률이 ${budgetChangePercent.toFixed(1)}%로 다소 높습니다. 예산 절감을 위한 추가 노력이 필요합니다.`;
    color = 'yellow';
  } else if (congestionPercent <= 95 && complaintScore < 55 && budgetChangePercent <= 15) {
    status = '🟢 정책 시험 적용 승인 (Best)';
    comment = '👍 혼잡도와 예산이 합리적인 수준입니다. 정책 시행을 강력히 권장합니다.';
    color = 'green';
    isRecommended = true;
  }

  return { status, comment, color, isRecommended };
};

/**
 * 전체 시나리오(배차 3~15분 x 버스감축 0~50%)를 완전탐색하여
 * 🔴가 아닌 시나리오 중 예산 증감률이 가장 낮은 대안을 추천한다 (Greedy).
 */
const findAlternative = (baseInputs, weather = { type: 'sunny', intensity: 0 }) => {
  const HEADWAYS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const BUS_CUTS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

  const searchSpace = [];
  for (const tramHeadway of HEADWAYS) {
    for (const busCut of BUS_CUTS) {
      const inputs = { ...baseInputs, tramHeadway, busCut };
      const results = runPolicySimulation(inputs, weather);
      const judgement = judgePolicy(results, weather);
      searchSpace.push({ input: { tramHeadway, busCut }, results, judgement });
    }
  }

  const validScenarios = searchSpace.filter((s) => !s.judgement.status.includes('🔴'));
  if (validScenarios.length === 0) {
    return { found: false, message: '조건(혼잡·민원 위험 없음)을 만족하는 시나리오를 찾을 수 없습니다.' };
  }

  validScenarios.sort((a, b) => a.results.budgetChangePercent - b.results.budgetChangePercent);
  return { found: true, ...validScenarios[0] };
};

module.exports = { runPolicySimulation, judgePolicy, findAlternative };
