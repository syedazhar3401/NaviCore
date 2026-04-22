import express from "express";
import axios from "axios";

const router = express.Router();

// Map Open-Meteo WMO weather codes to human-readable conditions
function wmoToCondition(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Clouds";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain";
  if (code <= 86) return "Snow";
  if (code <= 99) return "Thunderstorm";
  return "Clear";
}

router.get("/weather", async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng required" });
  }

  try {
    // Use Open-Meteo API — completely free, no API key needed
    const response = await axios.get(
      "https://api.open-meteo.com/v1/forecast",
      {
        params: {
          latitude: lat,
          longitude: lng,
          current: "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m",
          wind_speed_unit: "ms",
        },
      }
    );

    const current = response.data.current;

    res.json({
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      weather: wmoToCondition(current.weather_code),
      weatherCode: current.weather_code,
      temp: current.temperature_2m,
      humidity: current.relative_humidity_2m,
    });
  } catch (err: any) {
    console.error("Weather API error:", err?.response?.data || err?.message || err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

// Marine forecast endpoint — wave height, swell data
router.get("/weather/marine", async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng required" });
  }

  try {
    const response = await axios.get(
      "https://marine-api.open-meteo.com/v1/marine",
      {
        params: {
          latitude: lat,
          longitude: lng,
          current: "wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period",
        },
      }
    );

    const current = response.data.current;

    res.json({
      waveHeight: current.wave_height,
      wavePeriod: current.wave_period,
      waveDirection: current.wave_direction,
      swellHeight: current.swell_wave_height,
      swellPeriod: current.swell_wave_period,
    });
  } catch (err: any) {
    console.error("Marine API error:", err?.response?.data || err?.message || err);
    res.status(500).json({ error: "Marine weather fetch failed" });
  }
});

export default router;
