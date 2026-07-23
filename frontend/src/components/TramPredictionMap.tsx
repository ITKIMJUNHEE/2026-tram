import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip } from 'react-leaflet';
import {
  ArrowLeft, Calendar, Settings, Clock, Sun, Sunset,
  Bot, Sparkles, Zap, Bus, CarFront,
  CloudRain, Snowflake, ShoppingBag
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { runPredict } from '../api/client';
import { WeatherCondition, BusDataItem, PredictionStationResult, PredictionSimulationResult, PredictRequestParams } from '../types/api';

// ==========================================
// [0] 유틸리티 함수
// ==========================================
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 월별 계절 기본 날씨 (사용자가 이후 직접 조정 가능한 UI 기본값일 뿐, 실제 혼잡도 연산은 서버가 담당)
const getSeasonalDefault = (month: number): WeatherCondition => {
  if (month === 7 || month === 8) return { type: 'rain', intensity: 60 };
  if (month === 12 || month === 1 || month === 2) return { type: 'snow', intensity: 50 };
  return { type: 'sunny', intensity: 0 };
};

interface PredictionParams extends PredictRequestParams {
  tramInterval: number;
  busReduction: number;
  signalLevel: number;
  isAiMode: boolean;
  timeSlot: string;
  month: number;
}

// ==========================================
// [1] 컴포넌트
// ==========================================

interface SidebarProps {
  params: PredictionParams;
  setParams: (params: PredictionParams) => void;
}

const Sidebar = ({ params, setParams }: SidebarProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setParams({ ...params, [e.target.name]: Number(e.target.value) });
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => setParams({ ...params, month: Number(e.target.value) });
  const handleTimeChange = (newTimeSlot: string) => {
    let newInterval = params.tramInterval;
    if (params.isAiMode) {
      if (newTimeSlot === 'morning') newInterval = 4;
      else if (newTimeSlot === 'day') newInterval = 12;
      else if (newTimeSlot === 'evening') newInterval = 6;
    }
    setParams({ ...params, timeSlot: newTimeSlot, tramInterval: newInterval });
  };
  const toggleAiMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isAi = e.target.checked;
    let newInterval = params.tramInterval;
    if (isAi) {
      if (params.timeSlot === 'morning') newInterval = 4;
      else if (params.timeSlot === 'day') newInterval = 12;
      else if (params.timeSlot === 'evening') newInterval = 6;
    }
    setParams({ ...params, isAiMode: isAi, tramInterval: newInterval });
  };

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl h-full border border-white/50 flex flex-col p-5">
      <div className="flex items-center gap-2 mb-6 text-blue-800">
        <Settings className="w-6 h-6" />
        <h2 className="text-xl font-bold">운영 정책 제어</h2>
      </div>
      <div className="flex flex-col gap-6 flex-1 h-full justify-start">
        <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs"><Calendar className="w-3.5 h-3.5" /> 분석 시점</div>
            <span className="text-blue-600 font-black text-lg">{params.month}월</span>
          </div>
          <input type="range" min="1" max="12" step="1" value={params.month} onChange={handleMonthChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1"><span>1월</span><span>여름(7월)</span><span>12월</span></div>
        </div>
        <div>
          <label className="flex gap-2 font-bold text-gray-700 mb-2 items-center text-sm"><Clock className="w-4 h-4 text-orange-500" /> 운영 시간대</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ id: 'morning', label: '오전', icon: Sun }, { id: 'day', label: '평시', icon: Sun }, { id: 'evening', label: '오후', icon: Sunset }].map((slot) => (
              <button key={slot.id} onClick={() => handleTimeChange(slot.id)} className={`flex flex-col items-center justify-center py-3 rounded-lg text-xs font-bold border transition-all ${params.timeSlot === slot.id ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-500'}`}><slot.icon className={`w-4 h-4 mb-1 ${params.timeSlot === slot.id ? 'text-orange-600' : 'text-slate-400'}`} />{slot.label}</button>
            ))}
          </div>
        </div>
        <div className={`p-4 rounded-xl border transition-all ${params.isAiMode ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-2 items-center"><Bot className={`w-5 h-5 ${params.isAiMode ? 'text-blue-600' : 'text-slate-500'}`} /><span className={`font-bold ${params.isAiMode ? 'text-blue-900' : 'text-slate-700'}`}>AI 모드</span></div>
            <input type="checkbox" checked={params.isAiMode} onChange={toggleAiMode} className="w-5 h-5 accent-blue-600 cursor-pointer" />
          </div>
          {params.isAiMode ? <div className="text-[11px] text-blue-800"><Sparkles className="w-3 h-3 inline mr-1 text-yellow-500"/>AI 배차 최적화 중</div> : <p className="text-xs text-slate-500">수동 설정</p>}
        </div>
        <div className={params.isAiMode ? "opacity-50 pointer-events-none" : ""}>
          <label className="flex justify-between font-bold text-gray-700 mb-2 items-center"><div className="flex gap-2"><Clock className="w-4 h-4 text-gray-500" /> 배차 간격</div><span className="text-blue-600 font-bold">{params.tramInterval}분</span></label>
          <input type="range" name="tramInterval" min="3" max="15" step="1" value={params.tramInterval} onChange={handleChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600" />
        </div>
        <div>
          <label className="flex justify-between font-bold text-gray-700 mb-2 items-center"><div className="flex gap-2"><Zap className="w-4 h-4 text-purple-500" /> 신호 우선권</div><span className="text-purple-600 bg-purple-50 px-2 py-1 rounded text-sm">Lv.{params.signalLevel}</span></label>
          <input type="range" name="signalLevel" min="1" max="3" step="1" value={params.signalLevel} onChange={handleChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1 px-1"><span>균형</span><span>우선</span><span>절대</span></div>
        </div>
        <div>
          <label className="flex justify-between font-bold text-gray-700 mb-2 items-center"><div className="flex gap-2"><Bus className="w-4 h-4 text-red-500" /> 버스 감축</div><span className="text-red-600 font-bold">{params.busReduction}%</span></label>
          <input type="range" name="busReduction" min="0" max="50" step="5" value={params.busReduction} onChange={handleChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
        </div>
      </div>
    </div>
  );
};

interface KPICardsProps {
  results: PredictionSimulationResult | null;
}

interface CardProps {
  title: string;
  value: string | number;
  unit: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  subtext: string;
}

const KPICards = ({ results }: KPICardsProps) => {
  if (!results) return null;
  const Card = ({ title, value, unit, color, icon: Icon, subtext }: CardProps) => (
    <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-md border-l-4 border-transparent hover:border-blue-500 transition-all text-slate-800">
      <div className="flex justify-between items-start">
        <div><p className="text-slate-500 text-[11px] font-bold uppercase">{title}</p><h3 className="text-xl font-black mt-0.5">{value} <span className="text-xs font-normal text-slate-400">{unit}</span></h3></div>
        <div className={`p-2 rounded-full bg-opacity-10 ${color.replace("text-", "bg-")} ${color}`}><Icon className="w-5 h-5" /></div>
      </div>
      <p className={`text-[10px] mt-2 font-medium truncate ${subtext.includes("심각") || subtext.includes("위험") ? "text-red-500" : "text-slate-400"}`}>{subtext}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-3 mb-1">
      <Card title="평균 대기 시간" value={results.waitTime} unit="분" icon={Clock} color={Number(results.waitTime) > 10 ? "text-red-500" : "text-emerald-600"} subtext={Number(results.waitTime) > 10 ? "⚠️ 대기 시간 과다" : "쾌적한 환승 환경"} />
      <Card title="승용차 감소" value={results.carsReduced.toLocaleString()} unit="대/일" icon={CarFront} color="text-purple-600" subtext="도로 혼잡 완화" />
    </div>
  );
};

interface PredictionTramMapProps {
  simulationResult: PredictionSimulationResult | null;
  busStops?: BusDataItem[];
  weather?: WeatherCondition;
}

const TramMap = ({ simulationResult, busStops = [], weather = { type: 'sunny', intensity: 0 } }: PredictionTramMapProps) => {
  const stations = useMemo((): PredictionStationResult[] => {
    const rawStations = simulationResult?.stations || [];
    return rawStations.map(st => {
      let multiplier = 1.0;
      if (weather.type === 'rain') multiplier = 1.0 + (weather.intensity / 100) * 0.3;
      else if (weather.type === 'snow') multiplier = 1.0 + (weather.intensity / 100) * 0.8;
      return { ...st, congestion: Math.round(st.congestion * multiplier) };
    });
  }, [simulationResult, weather]);

  const centerPos: [number, number] = [36.3504, 127.3845];
  const mainLoopIds: number[] = []; for (let i = 201; i <= 240; i++) mainLoopIds.push(i); mainLoopIds.push(201);
  const yeonchukBranchIds = [212, 241, 242, 243, 244];
  const jinjamBranchIds = [233, 245];

  const getPathCoords = (idList: number[]): [number, number][] => idList.map(id => {
    const st = stations.find(s => Number(s.id) === Number(id));
    return st ? ([st.lat, st.lon ?? st.lng] as [number, number]) : null;
  }).filter((c): c is [number, number] => c !== null);

  const getStatusColor = (congestion: number): string => {
    if (congestion >= 130) return "#dc2626"; // 130 이상 빨강
    if (congestion >= 90) return "#ea580c"; // 90 이상 주황
    return "#10b981"; // 그 외 초록
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full z-0 bg-slate-50">
      <MapContainer center={centerPos} zoom={12} zoomControl={false} style={{ height: '100vh', width: '100vw' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; 트램 ON' />

        {/* 버스 팻말 & 정류장 */}
        {busStops && busStops.map((bus, index) => {
           const lat = parseFloat(String(bus.lat));
           const lng = parseFloat(String(bus.lon || bus.lng || bus.long || bus.longitude));
           const passengerCount = Number(bus.passengers) || 0;

           if (isNaN(lat) || isNaN(lng)) return null;

           let isNearTram = false;
           for (let tram of stations) {
             const dist = getDistanceFromLatLonInKm(lat, lng, tram.lat, tram.lon ?? tram.lng);
             if (dist <= 0.2) { isNearTram = true; break; }
           }
           if (!isNearTram) return null;

           const radius = Math.min(Math.max(passengerCount / 8000, 3), 7);

           let circleColor = '#cbd5e1'; let fillOpacity = 0.4;
           if (passengerCount > 30000) { circleColor = '#1e3a8a'; fillOpacity = 0.9; }
           else if (passengerCount > 10000) { circleColor = '#60a5fa'; fillOpacity = 0.7; }

           return (
             <CircleMarker key={`bus-${index}-${passengerCount}`} center={[lat, lng]} radius={radius} pathOptions={{ color: 'transparent', fillColor: circleColor, fillOpacity: fillOpacity }}>
                <Popup>
                   <div className="text-xs min-w-[100px]">
                     <strong className="block text-sm mb-1 text-slate-800">{bus.name}</strong>
                     <div className="flex justify-between items-center bg-slate-50 p-1 rounded">
                       <span className="text-slate-500">월 승하차</span>
                       <span className="text-blue-600 font-bold">{passengerCount.toLocaleString()}명</span>
                     </div>
                   </div>
                </Popup>
                {passengerCount > 10000 && (
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                    <span className="text-[14px] drop-shadow-md">🚌</span>
                  </Tooltip>
                )}
             </CircleMarker>
           );
        })}

        {getPathCoords(mainLoopIds).length > 0 && <Polyline positions={getPathCoords(mainLoopIds)} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />}
        {getPathCoords(yeonchukBranchIds).length > 0 && <Polyline positions={getPathCoords(yeonchukBranchIds)} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />}
        {getPathCoords(jinjamBranchIds).length > 0 && <Polyline positions={getPathCoords(jinjamBranchIds)} pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} />}

        {stations.map((st) => (
          <CircleMarker key={`tram-${st.id}`} center={[st.lat, st.lon ?? st.lng]} radius={st.congestion >= 100 ? 14 : 9} pathOptions={{ fillColor: getStatusColor(st.congestion), color: '#ffffff', weight: 3, fillOpacity: 1 }}>
            <Popup className="light-popup"><div className="text-center p-2 min-w-[150px]">
              <h3 className="font-bold text-lg mb-1 text-gray-900">{st.name}</h3>
              <p className="text-sm">트램 혼잡도: <span className="font-bold" style={{color: getStatusColor(st.congestion)}}>{st.congestion}%</span></p>
              {st.type === 'commercial' && <p className="text-[10px] text-blue-600 mt-1 font-bold"><ShoppingBag size={10} className="inline mr-1"/>주요 상권</p>}
            </div></Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

// ==========================================
// [2] 최종 메인 페이지 컴포넌트
// ==========================================

const TramPredictionMap = () => {
  const navigate = useNavigate();
  const [params, setParams] = useState<PredictionParams>({ tramInterval: 10, busReduction: 10, signalLevel: 2, isAiMode: false, timeSlot: 'day', month: 1 });
  const [results, setResults] = useState<PredictionSimulationResult | null>(null);
  const [busData, setBusData] = useState<BusDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherCondition>({ type: 'sunny', intensity: 0 });

  // 분석 시점(월)이 바뀔 때만 날씨 UI 기본값을 계절에 맞게 재설정
  useEffect(() => {
    setWeather(getSeasonalDefault(params.month));
  }, [params.month]);

  const executeSimulation = useCallback(() => {
    setLoading(true);
    runPredict(params)
      .then(({ results: r, busStops }) => {
        setResults(r);
        setBusData(busStops || []);
        setLoading(false);
      })
      .catch(() => {
        setResults(null);
        setBusData([]);
        setLoading(false);
      });
  }, [params]);

  useEffect(() => {
    executeSimulation();
  }, [executeSimulation]);

  if (loading && !results) return <div className="flex h-screen w-screen items-center justify-center bg-white text-blue-600 font-bold text-xl">데이터 분석 중...</div>;

  return (
    <div className={`relative w-screen h-screen overflow-hidden font-sans text-slate-800 select-none bg-slate-50`}>

      {/* 지도 */}
      <TramMap simulationResult={results} busStops={busData} weather={weather} />

      {/* 헤더 */}
      <header className={`absolute top-0 left-0 w-full p-6 z-50 pointer-events-none bg-gradient-to-b from-white/90 to-transparent flex justify-between items-start`}>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-blue-900 drop-shadow-sm">트램 ON</h1>
          <p className="text-slate-500 font-bold tracking-widest text-[11px] mt-1 pl-1">DAEJEON TRAM OPTIMIZATION SYSTEM</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 bg-white/80 border border-slate-200 text-slate-600 px-4 py-2 rounded-full font-bold text-xs shadow-sm hover:bg-slate-100 transition-all">
            <ArrowLeft size={14} /> 메인으로
          </button>
        </div>
      </header>

      {/* 왼쪽 패널 */}
      <aside className="absolute top-28 left-6 bottom-8 w-80 z-50 flex flex-col gap-4 hidden md:flex pointer-events-none">
        <div className="flex-1 min-h-0 pointer-events-auto shadow-2xl rounded-2xl overflow-hidden">
          <Sidebar params={params} setParams={setParams} />
        </div>
      </aside>

      {/* 오른쪽 패널 */}
      <aside className="absolute top-28 right-6 bottom-8 w-80 z-50 hidden md:flex flex-col gap-4 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white/50 shrink-0 pointer-events-auto">
           <div className="flex items-center gap-2 mb-3 text-blue-700"><Sun className="w-4 h-4" /> <h2 className="font-bold text-sm tracking-wide">기상 조건 설정</h2></div>
           <div className="flex gap-2 mb-4">
              {(['sunny', 'rain', 'snow'] as const).map(type => (
                <button key={type} onClick={() => setWeather({ type, intensity: type === 'sunny' ? 0 : 50 })} className={`flex-1 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${weather.type === type ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  {type === 'sunny' ? <Sun size={16}/> : type === 'rain' ? <CloudRain size={16}/> : <Snowflake size={16}/>}{type === 'sunny' ? '맑음' : type === 'rain' ? '비' : '눈'}
                </button>
              ))}
           </div>
           {weather.type !== 'sunny' && <div className="animate-fade-in pt-2 border-t border-slate-100"><div className="flex justify-between text-[11px] font-bold text-slate-600 mb-2"><span>강도</span><span className="text-blue-600">{weather.intensity}%</span></div><input type="range" min="10" max="100" step="10" value={weather.intensity} onChange={(e) => setWeather({...weather, intensity: Number(e.target.value)})} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /></div>}
        </div>
        <div className="pointer-events-auto">
          <KPICards results={results} />
        </div>
      </aside>

      <div className="absolute bottom-3 right-6 z-50 text-[10px] text-slate-500 font-medium bg-white/80 px-3 py-1 rounded-full backdrop-blur-md shadow-sm border border-slate-200">※ 2024년 대전광역시 공공데이터 기반 시뮬레이션</div>
    </div>
  );
};

export default TramPredictionMap;
