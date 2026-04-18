import express from "express";
import axios from "axios";
import { ports } from "../data/ports.js";
import { calculateDistance } from "../utils/distance.js";

const router = express.Router();

router.post("/mcp/analyze-risk", async (req, res) => {
  const { lat, lng, fuelRemaining, destination } = req.body;

  if (!lat || !lng || fuelRemaining === undefined) {
    return res.status(400).json({ error: "Missing required fields (lat, lng, fuelRemaining)" });
  }

  try {
    // 1. Get weather from our own weather endpoint
    const weatherRes = await axios.get(
      `http://localhost:${process.env.PORT || 4000}/api/weather?lat=${lat}&lng=${lng}`
    );

    const weather = weatherRes.data;

    // 2. Compute risk factors
    let weatherRisk = 0;
    if (weather.windSpeed > 8) weatherRisk += 0.4;
    if (weather.weather === "Rain" || weather.weather === "Thunderstorm" || weather.weather === "Storm")
      weatherRisk += 0.3;

    const fuelRisk = fuelRemaining < 100 ? 0.3 : 0.1;

    // Distance factor (demo — would use real port coordinates later)
    const distanceRisk = 0.2;

    const totalRisk = Math.min(weatherRisk + fuelRisk + distanceRisk, 1);

    // 3. Alerts
    const alerts: string[] = [];
    if (weather.windSpeed > 8) alerts.push("High wind speed");
    if (fuelRemaining < 100) alerts.push("Low fuel");
    if (weather.weather === "Rain") alerts.push("Rainy conditions");
    if (weather.weather === "Thunderstorm" || weather.weather === "Storm") alerts.push("Storm detected");

    // 4. Recommendation
    let recommendation = "Safe to proceed";
    if (totalRisk > 0.7) {
      recommendation = "Delay voyage or refuel immediately";
    } else if (totalRisk > 0.4) {
      recommendation = "Proceed with caution";
    }

    res.json({
      riskScore: totalRisk,
      alerts,
      recommendation,
      weather: {
        windSpeed: weather.windSpeed,
        condition: weather.weather,
        temp: weather.temp,
      },
      input: { lat, lng, fuelRemaining, destination },
    });
  } catch (err: any) {
    console.error("Risk analysis error:", err?.response?.data || err?.message || err);
    res.status(500).json({ error: "Risk analysis failed" });
  }
});

// --- Fuel Stop Recommendation Engine ---
router.post("/mcp/recommend-fuel-stop", async (req, res) => {
  const { lat, lng, fuelRemaining, fuelConsumptionRate } = req.body;

  if (!lat || !lng || !fuelRemaining) {
    return res.status(400).json({ error: "Missing inputs (lat, lng, fuelRemaining)" });
  }

  let bestPort: { name: string, country: string, distance: number, fuelPricePerTon: number, estimatedFuelNeeded: number, fuelRisk: number } | null = null;
  let bestScore = Infinity;

  for (const port of ports) {
    const distance = calculateDistance(lat, lng, port.lat, port.lng);

    // Fuel needed estimation (simple model)
    const estimatedFuelNeeded = distance * (fuelConsumptionRate || 10);

    const fuelRisk = estimatedFuelNeeded > fuelRemaining ? 1 : 0.2;

    const costScore =
      port.fuelPricePerTon * 0.5 +
      port.portFees * 0.3 +
      distance * 100 +
      fuelRisk * 500;

    if (costScore < bestScore) {
      bestScore = costScore;
      bestPort = {
        ...port,
        distance: Math.round(distance * 100) / 100,
        estimatedFuelNeeded: Math.round(estimatedFuelNeeded * 100) / 100,
        fuelRisk,
      };
    }
  }

  if (!bestPort) {
    return res.status(500).json({ error: "No ports available for routing." });
  }

  const recommendation =
    bestPort.fuelRisk === 1
      ? `URGENT: Refuel at ${bestPort.name}`
      : `Optimal refuel at ${bestPort.name}`;

  res.json({
    recommendedPort: bestPort.name,
    country: bestPort.country,
    distance: bestPort.distance,
    fuelPrice: bestPort.fuelPricePerTon,
    estimatedFuelNeeded: bestPort.estimatedFuelNeeded,
    recommendation,
    allPorts: ports.map((p: any) => {
      const d = calculateDistance(lat, lng, p.lat, p.lng);
      return {
        name: p.name,
        country: p.country,
        distance: Math.round(d * 100) / 100,
        fuelPrice: p.fuelPricePerTon,
        portFees: p.portFees,
        estimatedFuelNeeded: Math.round(d * (fuelConsumptionRate || 10) * 100) / 100,
        isRecommended: p.name === bestPort.name,
      };
    }),
  });
});

export default router;
