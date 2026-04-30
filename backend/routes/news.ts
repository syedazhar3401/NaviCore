import express from 'express';
import axios from 'axios';
import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Upstash Redis (optional - falls back to memory cache)
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('[News] Redis configured');
  }
} catch (error) {
  console.log('[News] Redis not available, using memory cache');
}

// In-memory cache fallback
const memoryCache = new Map<string, { data: any; expires: number }>();

async function getFromCache(key: string): Promise<any | null> {
  try {
    if (redis) {
      return await redis.get(key);
    }
    // Memory cache fallback
    const cached = memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    memoryCache.delete(key);
    return null;
  } catch {
    return null;
  }
}

async function setCache(key: string, value: any, ttl: number): Promise<void> {
  try {
    if (redis) {
      await redis.setex(key, ttl, value);
    } else {
      // Memory cache fallback
      memoryCache.set(key, { data: value, expires: Date.now() + ttl * 1000 });
    }
  } catch {
    // Ignore cache errors
  }
}

// Cache TTL in seconds
const CACHE_TTL = 900; // 15 minutes for digest
const RSS_CACHE_TTL = 600; // 10 minutes for individual feeds

// RSS Feed Sources - WorldMonitor Style
interface Feed {
  name: string;
  url: string;
  category: string;
  tier: number;
  lang?: string;
}

const RSS_FEEDS: Feed[] = [
  // Tier 1 - Premium World News
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world', tier: 1 },
  { name: 'Reuters World', url: 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en-US', category: 'world', tier: 1 },
  { name: 'AP News', url: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US', category: 'world', tier: 1 },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'world', tier: 1 },
  { name: 'France 24', url: 'https://www.france24.com/en/rss', category: 'world', tier: 2 },

  // US News
  { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', category: 'us', tier: 2 },
  { name: 'PBS Newshour', url: 'https://www.pbs.org/newshour/feeds/rss/headlines', category: 'us', tier: 2 },

  // Security & Defense
  { name: 'Defense One', url: 'https://www.defenseone.com/rss/all.xml', category: 'security', tier: 3 },
  { name: 'SecurityWeek', url: 'https://feeds.feedburner.com/securityweek', category: 'security', tier: 3 },
  { name: 'Homeland Security', url: 'https://www.dhs.gov/news-feed.xml', category: 'security', tier: 3 },

  // Tech & Cyber
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech', tier: 3 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech', tier: 3 },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'tech', tier: 3 },
  { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', category: 'tech', tier: 3 },

  // Business & Finance
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'financial', tier: 2 },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', category: 'financial', tier: 2 },
  { name: 'Financial Times', url: 'https://news.google.com/rss/search?q=site:ft.com&hl=en-US', category: 'financial', tier: 1 },

  // Energy & Resources
  { name: 'OilPrice.com', url: 'https://oilprice.com/rss/main', category: 'energy', tier: 3 },
  { name: 'Energy Central', url: 'https://feeds.energycentral.com/ec/all', category: 'energy', tier: 3 },

  // Europe
  { name: 'Euronews', url: 'https://www.euronews.com/rss', category: 'europe', tier: 2 },
  { name: 'EUobserver', url: 'https://euobserver.com/rss.xml', category: 'europe', tier: 3 },

  // Middle East
  { name: 'Middle East Eye', url: 'https://www.middleeasteye.net/rss', category: 'middle_east', tier: 2 },
  { name: 'MEMRI', url: 'https://www.memri.org/rss.xml', category: 'middle_east', tier: 3 },

  // Asia-Pacific
  { name: 'South China Morning Post', url: 'https://www.scmp.com/rss/91/feed', category: 'asia_pacific', tier: 2 },
  { name: 'Japan Times', url: 'https://www.japantimes.co.jp/feed/', category: 'asia_pacific', tier: 2 },

  // Africa
  { name: 'Africanews', url: 'https://www.africanews.com/rss', category: 'africa', tier: 2 },

  // Latin America
  { name: 'Reuters LatAm', url: 'https://news.google.com/rss/search?q=site:reuters.com+americas&hl=en-US', category: 'latin_america', tier: 2 },
];

// Threat classification keywords
const THREAT_KEYWORDS = {
  critical: [
    'breaking', 'urgent', 'war declared', 'invasion', 'coup',
    'assassination', 'nuclear launch', 'missile attack',
    'terrorist attack', 'hostage crisis', 'act of war'
  ],
  high: [
    'airstrike', 'bombing', 'missile', 'troops deployed',
    'invasion', 'siege', 'massacre', 'genocide', 'war crime',
    'cyberattack', 'ransomware', 'data breach', 'sanctions',
    'embargo', 'trade war', 'military strike'
  ],
  medium: [
    'protest', 'demonstration', 'unrest', 'riot', 'curfew',
    'martial law', 'emergency declared', 'conflict',
    'hurricane', 'earthquake', 'flood', 'wildfire', 'tsunami',
    'pandemic', 'outbreak', 'evacuation'
  ],
  low: [
    'diplomatic', 'negotiations', 'talks', 'summit', 'agreement',
    'peace deal', 'ceasefire', 'treaty signed'
  ]
};

const CATEGORIES: Record<string, string[]> = {
  conflict: ['war', 'invasion', 'airstrike', 'bombing', 'missile', 'troops', 'combat'],
  protest: ['protest', 'demonstration', 'unrest', 'riot'],
  disaster: ['hurricane', 'earthquake', 'flood', 'wildfire', 'tsunami'],
  economic: ['sanctions', 'embargo', 'trade war', 'currency crisis', 'market crash'],
  cyber: ['cyberattack', 'ransomware', 'data breach', 'hacking', 'malware'],
  diplomatic: ['summit', 'treaty', 'agreement', 'negotiations']
};

// Location database for geo-tagging
const LOCATION_DB: Record<string, { lat: number; lon: number; country: string; region: string }> = {
  'gaza': { lat: 31.5017, lon: 34.4668, country: 'Palestine', region: 'middle_east' },
  'israel': { lat: 31.0461, lon: 34.8516, country: 'Israel', region: 'middle_east' },
  'lebanon': { lat: 33.8547, lon: 35.8623, country: 'Lebanon', region: 'middle_east' },
  'iran': { lat: 32.4279, lon: 53.6880, country: 'Iran', region: 'middle_east' },
  'iraq': { lat: 33.2232, lon: 43.6793, country: 'Iraq', region: 'middle_east' },
  'syria': { lat: 34.8021, lon: 38.9968, country: 'Syria', region: 'middle_east' },
  'yemen': { lat: 15.5527, lon: 48.5164, country: 'Yemen', region: 'middle_east' },
  'saudi arabia': { lat: 23.8859, lon: 45.0792, country: 'Saudi Arabia', region: 'middle_east' },
  'turkey': { lat: 38.9637, lon: 35.2433, country: 'Turkey', region: 'middle_east' },
  'ukraine': { lat: 48.3794, lon: 31.1656, country: 'Ukraine', region: 'europe' },
  'russia': { lat: 61.5240, lon: 105.3188, country: 'Russia', region: 'europe' },
  'poland': { lat: 51.9194, lon: 19.1451, country: 'Poland', region: 'europe' },
  'germany': { lat: 51.1657, lon: 10.4515, country: 'Germany', region: 'europe' },
  'france': { lat: 46.2276, lon: 2.2137, country: 'France', region: 'europe' },
  'uk': { lat: 55.3781, lon: -3.4360, country: 'United Kingdom', region: 'europe' },
  'china': { lat: 35.8617, lon: 104.1954, country: 'China', region: 'asia_pacific' },
  'taiwan': { lat: 23.6978, lon: 120.9605, country: 'Taiwan', region: 'asia_pacific' },
  'japan': { lat: 36.2048, lon: 138.2529, country: 'Japan', region: 'asia_pacific' },
  'south korea': { lat: 35.9078, lon: 127.7669, country: 'South Korea', region: 'asia_pacific' },
  'north korea': { lat: 40.3399, lon: 127.5101, country: 'North Korea', region: 'asia_pacific' },
  'myanmar': { lat: 21.9162, lon: 95.9560, country: 'Myanmar', region: 'asia_pacific' },
  'pakistan': { lat: 30.3753, lon: 69.3451, country: 'Pakistan', region: 'asia_pacific' },
  'india': { lat: 20.5937, lon: 78.9629, country: 'India', region: 'asia_pacific' },
  'afghanistan': { lat: 33.9391, lon: 67.7100, country: 'Afghanistan', region: 'asia_pacific' },
  'nigeria': { lat: 9.0820, lon: 8.6753, country: 'Nigeria', region: 'africa' },
  'somalia': { lat: 5.1521, lon: 46.1996, country: 'Somalia', region: 'africa' },
  'mali': { lat: 17.5707, lon: -3.9962, country: 'Mali', region: 'africa' },
  'sudan': { lat: 12.8628, lon: 30.2176, country: 'Sudan', region: 'africa' },
  'ethiopia': { lat: 9.1450, lon: 40.4897, country: 'Ethiopia', region: 'africa' },
  'congo': { lat: -4.0383, lon: 21.7587, country: 'DR Congo', region: 'africa' },
  'venezuela': { lat: 6.4238, lon: -66.5897, country: 'Venezuela', region: 'latin_america' },
  'colombia': { lat: 4.5709, lon: -74.2973, country: 'Colombia', region: 'latin_america' },
  'argentina': { lat: -38.4161, lon: -63.6167, country: 'Argentina', region: 'latin_america' },
  'brazil': { lat: -14.2350, lon: -51.9253, country: 'Brazil', region: 'latin_america' },
  'mexico': { lat: 23.6345, lon: -102.5528, country: 'Mexico', region: 'latin_america' },
  'united states': { lat: 37.0902, lon: -95.7129, country: 'United States', region: 'us' },
  'usa': { lat: 37.0902, lon: -95.7129, country: 'United States', region: 'us' },
};

// Interfaces
interface ThreatInfo {
  level: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  confidence: number;
  source: string;
}

interface NewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  snippet: string;
  pubDate: string;
  fetchedAt: string;
  isAlert: boolean;
  tier: number;
  threat: ThreatInfo;
  lat: number | null;
  lon: number | null;
  locationName: string | null;
  region: string | null;
  lang: string;
  importanceScore: number;
  tags: string[];
}

// Generate ID from title (consistent hashing)
function hashTitle(title: string): string {
  let hash = 0;
  const str = title.toLowerCase().slice(0, 120);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `news-${Math.abs(hash).toString(36)}`;
}

// Classify threat level from text
function classifyThreat(text: string): ThreatInfo {
  const lowerText = text.toLowerCase();

  // Check keywords
  for (const [level, keywords] of Object.entries(THREAT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return {
          level: level as ThreatInfo['level'],
          category: detectCategory(lowerText),
          confidence: 0.85,
          source: 'keyword'
        };
      }
    }
  }

  return {
    level: 'info',
    category: detectCategory(lowerText),
    confidence: 0.5,
    source: 'keyword'
  };
}

// Detect event category
function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return category;
    }
  }

  return 'general';
}

// Detect location from text
function detectLocation(text: string): { lat: number; lon: number; country: string; region: string } | null {
  const lowerText = text.toLowerCase();

  for (const [key, coords] of Object.entries(LOCATION_DB)) {
    if (lowerText.includes(key)) {
      return coords;
    }
  }

  return null;
}

// Calculate importance score
function calculateImportance(text: string, threat: ThreatInfo, tier: number): number {
  let score = 50;

  const threatScores = { critical: 40, high: 25, medium: 15, low: 5, info: 0 };
  score += threatScores[threat.level] || 0;

  // Boost for breaking/urgent
  const lowerText = text.toLowerCase();
  if (lowerText.includes('breaking')) score += 15;
  if (lowerText.includes('urgent')) score += 10;
  if (lowerText.includes('exclusive')) score += 5;

  // Tier bonus (lower tier = higher priority)
  score += (4 - tier) * 5;

  return Math.min(100, score);
}

// Clean XML entities
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<\!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '');
}

// Extract XML tag content
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? decodeXmlEntities(match[1].trim()) : '';
}

// Parse RSS feed
async function fetchRSSFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    // Check cache
    const cacheKey = `rss:${feed.name.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await axios.get(feed.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NaviCore/1.0; NewsBot)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      maxRedirects: 5,
    });

    const xml = response.data;
    const items: NewsItem[] = [];

    // Extract items using regex
    const itemMatches = xml.match(/<item[\s>]([\s\S]*?)<\/item>/gi) || [];

    for (let i = 0; i < Math.min(itemMatches.length, 10); i++) {
      const item = itemMatches[i];

      // Extract fields
      const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const dateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

      const title = titleMatch ? decodeXmlEntities(titleMatch[1]) : '';
      const link = linkMatch ? decodeXmlEntities(linkMatch[1]) : '#';
      const description = descMatch ? decodeXmlEntities(descMatch[1]) : '';
      const pubDateStr = dateMatch ? decodeXmlEntities(dateMatch[1]) : '';

      if (!title) continue;

      const pubDate = new Date(pubDateStr);
      if (isNaN(pubDate.getTime())) continue;

      // Skip items older than 48 hours
      const hoursOld = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
      if (hoursOld > 48) continue;

      const location = detectLocation(title + ' ' + description);
      const threat = classifyThreat(title + ' ' + description);

      items.push({
        id: hashTitle(title),
        source: feed.name,
        title,
        link,
        snippet: description.substring(0, 300),
        pubDate: pubDate.toISOString(),
        fetchedAt: new Date().toISOString(),
        isAlert: threat.level === 'critical' || threat.level === 'high',
        tier: feed.tier,
        threat,
        lat: location?.lat ?? null,
        lon: location?.lon ?? null,
        locationName: location?.country ?? null,
        region: location?.region ?? feed.category,
        lang: feed.lang || 'en',
        importanceScore: calculateImportance(title, threat, feed.tier),
        tags: [feed.category.toUpperCase(), threat.category.toUpperCase()].filter(Boolean),
      });
    }

    // Cache results
    await setCache(cacheKey, items, RSS_CACHE_TTL);

    return items;
  } catch (error) {
    console.error(`[News] RSS fetch error for ${feed.name}:`, error);
    return [];
  }
}

// Deduplicate items by ID
function deduplicateItems(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

type CategoryKey = 'world' | 'us' | 'europe' | 'middle_east' | 'africa' | 'latin_america' | 'asia_pacific' | 'financial' | 'tech' | 'energy' | 'security';

// Organize news by category
function organizeByCategory(items: NewsItem[]): Record<CategoryKey, NewsItem[]> {
  const categories: Record<CategoryKey, NewsItem[]> = {
    world: [],
    us: [],
    europe: [],
    middle_east: [],
    africa: [],
    latin_america: [],
    asia_pacific: [],
    financial: [],
    tech: [],
    energy: [],
    security: [],
  };

  for (const item of items) {
    const region = item.region;
    const category = item.threat?.category;

    // Categorize by region
    if (region && categories[region as CategoryKey]) {
      categories[region as CategoryKey].push(item);
    }

    // Categorize by content type
    const title = item.title.toLowerCase();
    if (title.includes('oil') || title.includes('gas') || title.includes('energy') || item.tags?.includes('ENERGY')) {
      categories.energy.push(item);
    }
    if (title.includes('sanction') || title.includes('economy') || title.includes('trade') || title.includes('market') || title.includes('financial')) {
      categories.financial.push(item);
    }
    if (title.includes('cyber') || title.includes('hack') || title.includes('tech') || title.includes('ai') || title.includes('artificial intelligence')) {
      categories.tech.push(item);
    }
    if (title.includes('military') || title.includes('defense') || title.includes('security') || title.includes('terror')) {
      categories.security.push(item);
    }

    // Always add to world
    categories.world.push(item);
  }

  // Sort each category by importance and limit
  (Object.keys(categories) as CategoryKey[]).forEach(key => {
    categories[key] = categories[key]
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 20);
  });

  return categories;
}

/**
 * GET /api/news
 * Main endpoint - aggregates RSS feeds
 */
router.get('/news', async (req, res) => {
  try {
    const category = req.query.category as string || 'all';

    // Check for cached aggregate
    const cacheKey = `news:digest:${category}`;
    const cached = await getFromCache(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const startTime = Date.now();

    // Filter feeds by category if specified
    const feedsToFetch = category === 'all'
      ? RSS_FEEDS
      : RSS_FEEDS.filter(f => f.category === category || (category === 'security' && f.category === 'security'));

    // Fetch from all feeds in parallel with timeout
    const results = await Promise.allSettled(
      feedsToFetch.map(feed => fetchRSSFeed(feed))
    );

    // Collect successful results
    const allItems: NewsItem[] = [];
    let successCount = 0;

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
        if (result.value.length > 0) successCount++;
      } else {
        console.error(`[News] Failed to fetch ${feedsToFetch[idx]?.name}:`, result.reason);
      }
    });

    console.log(`[News] Successfully fetched from ${successCount}/${feedsToFetch.length} feeds, ${allItems.length} items`);

    // Deduplicate
    const uniqueItems = deduplicateItems(allItems);

    // Sort by date (newest first)
    uniqueItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Organize by category
    const byCategory = organizeByCategory(uniqueItems);

    // Get breaking alerts
    const breakingAlerts = uniqueItems
      .filter(i => i.isAlert)
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 20);

    const result = {
      items: uniqueItems.slice(0, 100), // Limit total items
      byCategory,
      breakingAlerts,
      totalSources: successCount,
      fetchTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // Cache the aggregate
    await setCache(cacheKey, result, CACHE_TTL);

    res.json(result);
  } catch (error) {
    console.error('[News] Aggregate error:', error);
    res.status(500).json({ error: 'Failed to fetch news', message: String(error) });
  }
});

/**
 * GET /api/news/digest
 * WorldMonitor-style digest endpoint
 */
router.get('/news/digest', async (req, res) => {
  try {
    const category = req.query.category as string || 'all';
    const cacheKey = `news:digest:${category}`;

    // Check cache
    const cached = await getFromCache(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Fetch fresh data
    const feedsToFetch = category === 'all'
      ? RSS_FEEDS
      : RSS_FEEDS.filter(f => f.category === category);

    const results = await Promise.allSettled(
      feedsToFetch.map(feed => fetchRSSFeed(feed))
    );

    const allItems: NewsItem[] = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      }
    });

    const uniqueItems = deduplicateItems(allItems);
    uniqueItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Group by category
    const byCategory = organizeByCategory(uniqueItems);

    const response = {
      categories: byCategory,
      generatedAt: new Date().toISOString(),
      totalItems: uniqueItems.length,
    };

    // Cache
    await setCache(cacheKey, response, CACHE_TTL);

    res.json(response);
  } catch (error) {
    console.error('[News] Digest error:', error);
    res.status(500).json({ error: 'Failed to generate digest' });
  }
});

/**
 * GET /api/news/health
 * Health check endpoint
 */
router.get('/news/health', async (req, res) => {
  try {
    // Check Redis connection (optional)
    let redisHealth = false;
    if (redis) {
      redisHealth = await redis.ping().then(() => true).catch(() => false);
    }

    // Try fetching one feed to check feed health
    const testFeed = RSS_FEEDS[0];
    const feedHealth = await axios.get(testFeed.url, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NaviCore/1.0)' }
    }).then(() => true).catch(() => false);

    res.json({
      status: feedHealth ? 'healthy' : 'degraded',
      redis: redisHealth ? 'connected' : (redis ? 'disconnected' : 'not_configured'),
      feeds: feedHealth ? 'reachable' : 'unreachable',
      totalFeeds: RSS_FEEDS.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

/**
 * GET /api/news/rss-proxy
 * Proxy for fetching RSS feeds (for frontend use)
 */
router.get('/news/rss-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NaviCore/1.0)',
      },
    });

    res.set('Content-Type', 'application/xml');
    res.send(response.data);
  } catch (error) {
    console.error('[News] RSS proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
});

export default router;
