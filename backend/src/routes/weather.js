const express = require('express');

const router = express.Router();

const FALLBACK_WEATHER = { temp: 4, desc: '흐림', icon: 'Clouds' };

router.get('/', async (req, res) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return res.json(FALLBACK_WEATHER);

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Daejeon&appid=${apiKey}&units=metric&lang=kr`
    );
    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    res.json({
      temp: Math.round(data.main.temp),
      desc: data.weather[0].description,
      icon: data.weather[0].main
    });
  } catch (err) {
    console.warn('[weather] 외부 API 연결 실패, 안전 모드로 대체:', err.message);
    res.json(FALLBACK_WEATHER);
  }
});

module.exports = router;
