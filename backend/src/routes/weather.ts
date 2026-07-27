import express, { Request, Response } from 'express';
import { WeatherApiResponse } from '../types';

const router = express.Router();

// 지도 중심으로도 쓰는 대전 좌표(TramMap.tsx 등)와 동일하게 맞춘다.
const DAEJEON_LAT = 36.3504;
const DAEJEON_LON = 127.3845;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10분 — OWM 무료 플랜은 갱신이 잦지 않아 매 요청마다 부를 필요가 없음

const FALLBACK_WEATHER: WeatherApiResponse = { temp: 4, feelsLike: 2, humidity: 60, desc: '흐림', icon: 'Clouds' };

interface OpenWeatherResponse {
  main: { temp: number; feels_like: number; humidity: number };
  weather: { main: string; description: string }[];
  rain?: { '1h'?: number };
}

let cachedWeather: WeatherApiResponse | null = null;
let cachedAt = 0;

router.get('/', async (req: Request, res: Response) => {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) return res.json(FALLBACK_WEATHER);

  if (cachedWeather && Date.now() - cachedAt < CACHE_TTL_MS) {
    return res.json(cachedWeather);
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${DAEJEON_LAT}&lon=${DAEJEON_LON}&appid=${apiKey}&units=metric&lang=kr`
    );
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = (await response.json()) as OpenWeatherResponse;
    const rain1h = data.rain?.['1h'];

    const weather: WeatherApiResponse = {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      desc: data.weather[0].description,
      icon: data.weather[0].main,
      ...(rain1h !== undefined ? { rain1h } : {})
    };

    cachedWeather = weather;
    cachedAt = Date.now();
    res.json(weather);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[weather] 외부 API 연결 실패, 안전 모드로 대체:', message);
    res.json(FALLBACK_WEATHER);
  }
});

export default router;
