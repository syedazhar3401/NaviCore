import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { ports } from '../data/ports.js';
import { calculateDistance } from '../utils/distance.js';

const router = express.Router();
const prisma = new PrismaClient();

// --- Singleton Rate Limiting ---
// Prevents simultaneous concurrent calls to newsdata.io
let lastFetchTime = 0;
let fetchInProgress = false;
const MIN_FETCH_INTERVAL_MS = 10000; // 10 seconds between API calls

/**
 * GET /news?lat=...&lng=...
 * 
 * Accepts coordinates, finds the nearest port to determine region,
 * fetches maritime/shipping news for that country, caches results,
 * and falls back to cache on API failure.
 */
router.get('/news', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  // --- Location → Nearest Port → Country ---
  let nearestPort = ports[0];
  let minDist = Infinity;

  if (nearestPort) {
    for (const port of ports) {
      const d = calculateDistance(latitude, longitude, port.lat, port.lng);
      if (d < minDist) {
        minDist = d;
        nearestPort = port;
      }
    }
  }

  const region = nearestPort?.country ?? 'Global';

  // --- Check Cache First (valid for 30 minutes) ---
  try {
    const cached = await prisma.newsCache.findFirst({
      where: { region },
      orderBy: { fetchedAt: 'desc' },
    });

    const cacheAge = cached ? (Date.now() - cached.fetchedAt.getTime()) : Infinity;
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    if (cached && cacheAge < CACHE_TTL) {
      return res.json({
        source: 'cache',
        degraded: false,
        region,
        nearestPort: nearestPort?.name ?? 'Unknown',
        articles: cached.payload,
        cachedAt: cached.fetchedAt,
      });
    }
  } catch (cacheErr) {
    console.error('[News] Cache read error:', cacheErr);
  }

  // --- Singleton Lock: Prevent Concurrent API Calls ---
  const now = Date.now();
  if (fetchInProgress || (now - lastFetchTime) < MIN_FETCH_INTERVAL_MS) {
    // Fall back to any cached data
    return await fallbackToCache(res, region, nearestPort?.name ?? 'Unknown');
  }

  fetchInProgress = true;
  lastFetchTime = now;

  try {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) {
      fetchInProgress = false;
      return res.status(500).json({ error: 'NEWSDATA_API_KEY not configured' });
    }

    // Map country names to NewsData country codes
    const countryCode = getCountryCode(region);

    const response = await axios.get('https://newsdata.io/api/1/latest', {
      params: {
        apikey: apiKey,
        q: 'shipping OR maritime OR port OR vessel OR cargo',
        country: countryCode,
        language: 'en',
        size: 10,
      },
      timeout: 8000, // 8 second timeout
    });

    const articles = (response.data?.results || []).map((article: any) => ({
      title: article.title,
      description: article.description,
      link: article.link,
      source: article.source_name || article.source_id,
      pubDate: article.pubdate,
      imageUrl: article.image_url,
      category: article.category,
      country: article.country,
    }));

    // --- Cache the results ---
    try {
      await prisma.newsCache.create({
        data: {
          region,
          fetchedAt: new Date(),
          payload: articles,
        },
      });
    } catch (cacheWriteErr) {
      console.error('[News] Cache write error:', cacheWriteErr);
    }

    fetchInProgress = false;

    res.json({
      source: 'live',
      degraded: false,
      region,
      nearestPort: nearestPort?.name ?? 'Unknown',
      articles,
      fetchedAt: new Date(),
    });
  } catch (apiErr: any) {
    fetchInProgress = false;
    console.error('[News] API fetch error:', apiErr?.response?.data || apiErr?.message);

    // --- Fallback to Cache ---
    return await fallbackToCache(res, region, nearestPort?.name ?? 'Unknown');
  }
});

/**
 * Fallback: return the most recent cached news for this region,
 * flagged with `degraded: true`.
 */
async function fallbackToCache(res: any, region: string, portName: string) {
  try {
    const cached = await prisma.newsCache.findFirst({
      where: { region },
      orderBy: { fetchedAt: 'desc' },
    });

    if (cached) {
      return res.json({
        source: 'cache',
        degraded: true,
        region,
        nearestPort: portName,
        articles: cached.payload,
        cachedAt: cached.fetchedAt,
        message: 'Live fetch unavailable — showing cached results',
      });
    }

    // No cache available at all
    return res.json({
      source: 'none',
      degraded: true,
      region,
      nearestPort: portName,
      articles: [],
      message: 'No news available for this region yet',
    });
  } catch (err) {
    console.error('[News] Fallback cache error:', err);
    return res.json({
      source: 'none',
      degraded: true,
      region,
      nearestPort: portName,
      articles: [],
      message: 'News service temporarily unavailable',
    });
  }
}

/**
 * Map country names to NewsData.io country codes
 */
function getCountryCode(country: string): string {
  const map: Record<string, string> = {
    'Malaysia': 'my',
    'Singapore': 'sg',
    'Indonesia': 'id',
    'Thailand': 'th',
    'Vietnam': 'vn',
    'Philippines': 'ph',
    'Myanmar': 'mm',
    'Cambodia': 'kh',
    'India': 'in',
    'Sri Lanka': 'lk',
    'Bangladesh': 'bd',
    'Pakistan': 'pk',
    'UAE': 'ae',
    'United Arab Emirates': 'ae',
    'Saudi Arabia': 'sa',
    'Oman': 'om',
    'Qatar': 'qa',
    'Kuwait': 'kw',
    'Bahrain': 'bh',
    'Iran': 'ir',
    'Iraq': 'iq',
    'Egypt': 'eg',
    'Kenya': 'ke',
    'Tanzania': 'tz',
    'South Africa': 'za',
    'Nigeria': 'ng',
    'Ghana': 'gh',
    'Morocco': 'ma',
    'China': 'cn',
    'Japan': 'jp',
    'South Korea': 'kr',
    'Taiwan': 'tw',
    'Hong Kong': 'hk',
    'Australia': 'au',
    'New Zealand': 'nz',
    'Papua New Guinea': 'pg',
    'United Kingdom': 'gb',
    'Netherlands': 'nl',
    'Germany': 'de',
    'France': 'fr',
    'Spain': 'es',
    'Italy': 'it',
    'Greece': 'gr',
    'Turkey': 'tr',
    'Belgium': 'be',
    'Denmark': 'dk',
    'Norway': 'no',
    'Sweden': 'se',
    'Finland': 'fi',
    'Poland': 'pl',
    'Russia': 'ru',
    'United States': 'us',
    'Canada': 'ca',
    'Mexico': 'mx',
    'Panama': 'pa',
    'Brazil': 'br',
    'Argentina': 'ar',
    'Chile': 'cl',
    'Colombia': 'co',
    'Peru': 'pe',
  };

  return map[country] ?? 'sg'; // default to Singapore
}

export default router;
