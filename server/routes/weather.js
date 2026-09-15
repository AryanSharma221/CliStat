import { Router } from 'express';

const router = Router();
const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// In-memory cache to avoid hammering the free-tier rate limit
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

// GET /api/weather/current?lat=37.7749&lon=-122.4194
router.get('/current', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 37.7749;
    const lon = parseFloat(req.query.lon) || -122.4194;
    const cacheKey = `current_${lat}_${lon}`;

    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();
      console.error(`[Weather] OpenWeatherMap ${response.status}: ${body}`);
      return res.status(response.status).json({ error: body });
    }

    const raw = await response.json();

    const data = {
      outdoorTempF: raw.main.temp,
      outdoorTempC: parseFloat(((raw.main.temp - 32) * 5 / 9).toFixed(1)),
      feelsLikeF: raw.main.feels_like,
      humidity: raw.main.humidity,
      cloud: raw.clouds.all,
      windSpeed: raw.wind.speed,
      description: raw.weather[0]?.description || 'Unknown',
      icon: raw.weather[0]?.icon || '01d',
      sunrise: raw.sys.sunrise,
      sunset: raw.sys.sunset,
      city: raw.name,
      timestamp: Date.now()
    };

    cache.set(cacheKey, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('[Weather] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weather/forecast?lat=37.7749&lon=-122.4194
router.get('/forecast', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 37.7749;
    const lon = parseFloat(req.query.lon) || -122.4194;
    const cacheKey = `forecast_${lat}_${lon}`;

    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();
      console.error(`[Weather] Forecast ${response.status}: ${body}`);
      return res.status(response.status).json({ error: body });
    }

    const raw = await response.json();

    const data = raw.list.map(entry => ({
      timestamp: entry.dt * 1000,
      dateTime: new Date(entry.dt * 1000).toISOString(),
      tempF: entry.main.temp,
      humidity: entry.main.humidity,
      cloud: entry.clouds.all,
      windSpeed: entry.wind.speed,
      description: entry.weather[0]?.description || 'Unknown'
    }));

    cache.set(cacheKey, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('[Weather] Forecast error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
