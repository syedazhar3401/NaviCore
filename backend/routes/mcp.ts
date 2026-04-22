import express from "express";
import axios from "axios";
import { ports } from "../data/ports.js";
import { calculateDistance } from "../utils/distance.js";

const router = express.Router();

const BACKEND_BASE = `http://localhost:${process.env.PORT || 4000}`;

router.post("/mcp/analyze-risk", async (req, res) => {
  const { lat, lng, fuelRemaining, destination } = req.body;

  if (!lat || !lng || fuelRemaining === undefined) {
    return res.status(400).json({ error: "Missing required fields (lat, lng, fuelRemaining)" });
  }

  try {
    // 1. Get weather from our own weather endpoint
    const weatherRes = await axios.get(
      `${BACKEND_BASE}/api/weather?lat=${lat}&lng=${lng}`
    );
    const weather = weatherRes.data;

    // 2. Try to get marine data (wave height etc.) — graceful fallback
    let marine: any = null;
    try {
      const marineRes = await axios.get(
        `${BACKEND_BASE}/api/weather/marine?lat=${lat}&lng=${lng}`
      );
      marine = marineRes.data;
    } catch {
      // Marine data may not be available for all coordinates — that's OK
    }

    // Helper function for clamping values
    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

    // --- W: Weather Risk (30%) ---
    const windScore = clamp((weather.windSpeed - 8) / (15 - 8), 0, 1);
    
    let conditionScore = 0;
    if (weather.weather === "Thunderstorm" || weather.weather === "Storm") conditionScore = 1;
    else if (weather.weather === "Rain" || weather.weather === "Fog" || weather.weather === "Drizzle") conditionScore = 0.5;
    else if (weather.weather === "Clouds") conditionScore = 0.2;

    const weatherRisk = clamp((windScore * 0.7) + (conditionScore * 0.3), 0, 1);

    // --- S: Sea State Risk (15%) ---
    let seaRisk = 0;
    if (marine?.waveHeight) {
      // Scales linearly from 1.5m to 4.0m
      seaRisk = clamp((marine.waveHeight - 1.5) / (4.0 - 1.5), 0, 1);
    }

    // --- D: Distance Risk (20%) ---
    let distanceRisk = 0.1; // default minimum
    let distanceNm: number | null = null;
    let estFuelNeeded = 0;
    
    if (destination) {
      const destPort = ports.find(
        (p) => p.name.toLowerCase().includes(destination.toLowerCase()) ||
               p.country.toLowerCase().includes(destination.toLowerCase())
      );
      if (destPort) {
        distanceNm = calculateDistance(lat, lng, destPort.lat, destPort.lng);
        distanceRisk = clamp(distanceNm / 2000, 0.1, 1);
        estFuelNeeded = distanceNm * 0.15; // 0.15 Tonnes/NM assumption
      }
    }

    // --- F: Fuel Risk (35%) ---
    let fuelRisk = 0;
    if (distanceNm) {
      const ratio = estFuelNeeded / fuelRemaining;
      fuelRisk = clamp((ratio - 0.5) / 0.4, 0, 1);
    } else {
      // Fallback if no destination given
      fuelRisk = fuelRemaining < 50 ? 1 : fuelRemaining < 100 ? 0.6 : 0;
    }

    // Total Risk Calculation
    const totalRisk = clamp((weatherRisk * 0.30) + (seaRisk * 0.15) + (fuelRisk * 0.35) + (distanceRisk * 0.20), 0, 1);

    // 4. Alerts
    const alerts: string[] = [];
    if (weather.windSpeed > 15) alerts.push(`Severe wind: ${weather.windSpeed.toFixed(1)} m/s`);
    if (fuelRisk > 0.8) alerts.push("Critical fuel level for journey");
    if (weather.weather === "Thunderstorm") alerts.push("Storm detected — avoid area");
    if (marine?.waveHeight && marine.waveHeight > 4.0) alerts.push(`Dangerous waves: ${marine.waveHeight.toFixed(1)}m`);

    // 5. Recommendation
    let recommendation = "Safe to proceed — conditions favorable";
    if (totalRisk > 0.7) {
      recommendation = "⚠️ Delay voyage or seek shelter and refuel immediately";
    } else if (totalRisk > 0.5) {
      recommendation = "Proceed with extreme caution — monitor conditions closely";
    } else if (totalRisk > 0.3) {
      recommendation = "Proceed with caution — some risk factors elevated";
    }

    res.json({
      riskScore: Math.round(totalRisk * 100) / 100,
      weatherRisk: Math.round(weatherRisk * 100) / 100,
      seaRisk: Math.round(seaRisk * 100) / 100,
      fuelRisk: Math.round(fuelRisk * 100) / 100,
      distanceRisk: Math.round(distanceRisk * 100) / 100,
      alerts,
      recommendation,
      weather: {
        windSpeed: weather.windSpeed,
        windDirection: weather.windDirection,
        condition: weather.weather,
        temp: weather.temp,
        humidity: weather.humidity,
      },
      marine: marine ? {
        waveHeight: marine.waveHeight,
        wavePeriod: marine.wavePeriod,
        swellHeight: marine.swellHeight,
      } : null,
      distanceToDestination: distanceNm ? Math.round(distanceNm) : null,
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

  // Consumption rate in tonnes per nautical mile (default 0.15 for medium vessel)
  const consumptionPerNm = fuelConsumptionRate || 0.15;

  let bestPort: {
    name: string; country: string; lat: number; lng: number;
    distance: number; fuelPricePerTon: number; portFees: number;
    estimatedFuelNeeded: number; fuelRisk: number; reachable: boolean;
  } | null = null;
  let bestScore = Infinity;

  const allPortResults = ports.map((port) => {
    const distance = calculateDistance(lat, lng, port.lat, port.lng);
    const estimatedFuelNeeded = distance * consumptionPerNm;
    const reachable = estimatedFuelNeeded <= fuelRemaining;
    const fuelRisk = !reachable ? 1 : estimatedFuelNeeded > fuelRemaining * 0.8 ? 0.6 : 0.1;

    // Score: balance cost, distance, and fuel risk (lower is better)
    const costScore =
      port.fuelPricePerTon * 0.3 +
      port.portFees * 0.2 +
      distance * 0.8 +
      fuelRisk * 1000;

    const result = {
      name: port.name,
      country: port.country,
      lat: port.lat,
      lng: port.lng,
      distance: Math.round(distance),
      fuelPricePerTon: port.fuelPricePerTon,
      portFees: port.portFees,
      estimatedFuelNeeded: Math.round(estimatedFuelNeeded),
      fuelRisk,
      reachable,
      costScore,
    };

    if (reachable && costScore < bestScore) {
      bestScore = costScore;
      bestPort = result;
    }

    return result;
  });

  // If no reachable port, pick the closest one
  if (!bestPort) {
    const closest = allPortResults.sort((a, b) => a.distance - b.distance)[0];
    if (closest) {
      bestPort = closest;
    }
  }

  if (!bestPort) {
    return res.status(500).json({ error: "No ports available for routing." });
  }

  const recommendation =
    !bestPort.reachable
      ? `🚨 EMERGENCY: Insufficient fuel to reach ${bestPort.name} — request assistance`
      : bestPort.fuelRisk > 0.5
        ? `⚠️ URGENT: Refuel at ${bestPort.name} (${bestPort.distance} NM)`
        : `✅ Optimal refuel at ${bestPort.name} (${bestPort.distance} NM)`;

  res.json({
    recommendedPort: bestPort.name,
    country: bestPort.country,
    lat: bestPort.lat,
    lng: bestPort.lng,
    distance: bestPort.distance,
    fuelPrice: bestPort.fuelPricePerTon,
    portFees: bestPort.portFees,
    estimatedFuelNeeded: bestPort.estimatedFuelNeeded,
    reachable: bestPort.reachable,
    recommendation,
    allPorts: allPortResults
      .sort((a, b) => a.distance - b.distance)
      .map((p) => ({
        name: p.name,
        country: p.country,
        lat: p.lat,
        lng: p.lng,
        distance: p.distance,
        fuelPrice: p.fuelPricePerTon,
        portFees: p.portFees,
        estimatedFuelNeeded: p.estimatedFuelNeeded,
        reachable: p.reachable,
        isRecommended: bestPort ? p.name === bestPort.name : false,
      })),
  });
});

export default router;
