import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/weather", async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng required" });
  }

  try {
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat,
          lon: lng,
          appid: process.env.OPENWEATHER_API_KEY,
          units: "metric",
        },
      }
    );

    const data = response.data;

    res.json({
      windSpeed: data.wind.speed,
      weather: data.weather[0].main,
      temp: data.main.temp,
    });
  } catch (err: any) {
    console.error("Weather API error:", err?.response?.data || err?.message || err);
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

export default router;
