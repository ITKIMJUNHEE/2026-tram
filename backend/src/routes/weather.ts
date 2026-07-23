import express, { Request, Response } from 'express';
import { WeatherApiResponse } from '../types';

const router = express.Router();

const FALLBACK_WEATHER: WeatherApiResponse = { temp: 4, desc: '흐림', icon: 'Clouds' };

interface OpenWeatherResponse {
  main: { temp: number };
  weather: { description: string; main: string }[];
}

router.get('/', async (req: Request, res: Response) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return res.json(FALLBACK_WEATHER);

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Daejeon&appid=${apiKey}&units=metric&lang=kr`
    );
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = (await response.json()) as OpenWeatherResponse;
    res.json({
      temp: Math.round(data.main.temp),
      desc: data.weather[0].description,
      icon: data.weather[0].main
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[weather] 외부 API 연결 실패, 안전 모드로 대체:', message);
    res.json(FALLBACK_WEATHER);
  }
});

export default router;
