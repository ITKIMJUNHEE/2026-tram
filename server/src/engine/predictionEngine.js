/**
 * 예측 지도 시뮬레이션 엔진 (월별/시간대별 혼잡도 예측)
 * 기존 프론트엔드(TramPredictionMap.jsx)에 하드코딩되어 있던 runSimulation 로직을
 * 그대로 이식하되, 정거장 목록은 하드코딩 배열 대신 DB에서 주입받는다.
 *
 * 참고: busData 각 항목에는 원본 데이터셋 상 nearest_tram_id 필드가 존재하지 않아
 * "버스 데이터 연동" 가중치 로직은 원본 프론트엔드에서도 항상 0으로 계산되던 부분이다.
 * 동작을 바꾸지 않기 위해 원본 그대로 이식했다 (버스 정류장 좌표는 지도 표시용으로만 사용됨).
 */

const runPredictionSimulation = (stations, interval, busReduction, busData = [], signalLevel = 2, isAiMode = false, timeSlot = 'day') => {
  const BASE_FIXED_COST = 3000;
  let timeMultiplier = 1.0;
  let demandLabel = '평시';

  if (timeSlot === 'morning') { demandLabel = '출근'; timeMultiplier = 2.5; }
  else if (timeSlot === 'evening') { demandLabel = '퇴근'; timeMultiplier = 2.0; }
  else { timeMultiplier = 1.0; }

  let totalAllPassengers = 0;

  const detailedStations = stations.map((st) => {
    let stationPassengers = st.base;

    let typeFactor = 1.0;
    if (timeSlot === 'morning' && st.type === 'residential') typeFactor = 2.5;
    if (timeSlot === 'evening' && st.type === 'commercial') typeFactor = 2.0;
    stationPassengers *= typeFactor;

    stationPassengers *= 1 + st.commercialScore * 0.15;

    if (busData && busData.length > 0) {
      const nearbyBuses = busData.filter((bus) => Number(bus.nearest_tram_id) === Number(st.id));
      const busPassengerSum = nearbyBuses.reduce((sum, bus) => sum + (Number(bus.passengers) || 0), 0);
      const dailyBusPassengers = busPassengerSum / 30;
      const transferRate = 0.6 + busReduction / 100;
      stationPassengers += dailyBusPassengers * transferRate;
    }

    const signalFactor = signalLevel === 1 ? 1.3 : signalLevel === 3 ? 0.8 : 1.0;
    const finalPassengers = stationPassengers * timeMultiplier * signalFactor;
    totalAllPassengers += finalPassengers;

    const peakHourRatio = 0.2;
    const passengersAtPeak = finalPassengers * peakHourRatio;

    const capacityPerTram = 250;
    const tripsPerHour = 60 / interval;
    const totalCapacity = capacityPerTram * tripsPerHour;

    let congestion = (passengersAtPeak / totalCapacity) * 100;
    if (st.shared) congestion *= 1.2;
    if (isAiMode) congestion *= 0.7;

    return { ...st, congestion: Math.round(congestion), passengers: Math.round(finalPassengers) };
  });

  const avgCongestion = detailedStations.length > 0
    ? Math.round(detailedStations.reduce((sum, st) => sum + st.congestion, 0) / detailedStations.length)
    : 0;

  let waitTime = interval / 2;
  if (avgCongestion > 120) waitTime = interval * 1.5;
  else if (avgCongestion > 100) waitTime = interval * 1.2;
  if (isAiMode) waitTime = 3.5;

  const operationCost = (60 / interval) * 300;
  let totalBudget = BASE_FIXED_COST + operationCost;
  if (isAiMode) totalBudget *= 0.85;

  const carsReduced = Math.round(totalAllPassengers * 0.12 + busReduction * 50);

  let complaintRisk = '안정';
  let complaintMsg = `${demandLabel} 시간대 원활합니다.`;

  if (isAiMode) {
    complaintMsg = '✨ AI 최적화 가동 중';
  } else {
    if (busReduction >= 40) { complaintRisk = '심각'; complaintMsg = '🚗 버스 과다 감축! 교통 마비!'; }
    else if (avgCongestion > 120) { complaintRisk = '위험'; complaintMsg = `🚨 ${demandLabel} 혼잡도 위험! 배차 좁히세요!`; }
    else if (avgCongestion > 90) { complaintRisk = '주의'; complaintMsg = '⚠️ 주요 역 혼잡 시작.'; }
    else if (interval > 12) { complaintRisk = '주의'; complaintMsg = '🐢 배차가 너무 깁니다.'; }
  }

  return {
    budget: Math.round(totalBudget),
    congestion: avgCongestion,
    complaintRisk,
    complaintMsg,
    stations: detailedStations,
    waitTime: waitTime.toFixed(1),
    carsReduced
  };
};

module.exports = { runPredictionSimulation };
