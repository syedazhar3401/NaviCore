import type { NewsItem, AggregationResult } from '@/types/news';
import { RSS_FEEDS } from '@/config/feeds';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4000`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 45000;

// ─── Demo / Fallback Data (used when backend is unavailable) ──────────────
function getDemoNews(): AggregationResult {
  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60000);
  const hrsAgo = (h: number) => new Date(now.getTime() - h * 3600000);

  const items: NewsItem[] = [
    {
      id: 'demo-1', source: 'Reuters World',
      title: 'NATO Conducts Largest Maritime Patrol Exercise in Baltic Sea',
      link: 'https://reuters.com/', snippet: '50+ vessels from 12 NATO allies participate in Operation Baltic Shield amid heightened regional tensions.',
      pubDate: minsAgo(18), fetchedAt: minsAgo(17), isAlert: true, tier: 1,
      threat: { level: 'high', category: 'military', confidence: 0.92, source: 'ml' },
      lat: 55.3, lon: 21.1, locationName: 'Baltic Sea – near Kaliningrad Exclusion Zone', lang: 'en',
      importanceScore: 94, corroborationCount: 7, storyMeta: { firstSeen: Date.now() - 1080000, mentionCount: 23, sourceCount: 8, phase: 'breaking' },
      velocity: { sourcesPerHour: 14, level: 'spike', trend: 'rising', sentiment: 'negative', sentimentScore: -0.4 },
      tags: ['ALERT', 'CONFLICT', 'ONGOING'],
    },
    {
      id: 'demo-2', source: 'AP News',
      title: 'Houthi Rebels Launch New Drone Swarm Toward Red Sea Shipping Lanes',
      link: 'https://apnews.com/', snippet: 'US Navy destroyers intercepting multiple unmanned aerial vehicles in Bab al-Mandeb strait.',
      pubDate: minsAgo(42), fetchedAt: minsAgo(41), isAlert: true, tier: 1,
      threat: { level: 'critical', category: 'conflict', confidence: 0.96, source: 'keyword' },
      lat: 13.3, lon: 43.2, locationName: 'Bab al-Mandab Strait – Yemen', lang: 'en',
      importanceScore: 98, corroborationCount: 12, storyMeta: { firstSeen: Date.now() - 2520000, mentionCount: 45, sourceCount: 11, phase: 'breaking' },
      velocity: { sourcesPerHour: 22, level: 'viral', trend: 'rising', sentiment: 'negative', sentimentScore: -0.65 },
      tags: ['ALERT', 'CONFLICT', 'CRISIS'],
    },
    {
      id: 'demo-3', source: 'Defense One',
      title: 'Chinese Naval Expansion: New Submarine Base Detected Near Spratly Islands',
      link: 'https://defenseone.com/', snippet: 'Satellite imagery reveals construction of deep-water berthing facilities capable of hosting nuclear submarines.',
      pubDate: hrsAgo(2), fetchedAt: hrsAgo(1.9), isAlert: true, tier: 3,
      threat: { level: 'high', category: 'military', confidence: 0.88, source: 'llm' },
      lat: 9.8, lon: 114.2, locationName: 'Spratly Islands – South China Sea', lang: 'en',
      importanceScore: 89, corroborationCount: 4, storyMeta: { firstSeen: Date.now() - 7200000, mentionCount: 31, sourceCount: 6, phase: 'developing' },
      velocity: { sourcesPerHour: 8, level: 'elevated', trend: 'stable', sentiment: 'neutral', sentimentScore: -0.1 },
      tags: ['ALERT', 'MILITARY'],
    },
    {
      id: 'demo-4', source: 'SecurityWeek',
      title: 'Major Port Cyberattack Hits Rotterdam Terminal Operations',
      link: 'https://securityweek.com/', snippet: 'Ransomware gang claims responsibility for disrupting container tracking systems at Europe\'s busiest port.',
      pubDate: hrsAgo(3), fetchedAt: hrsAgo(2.9), isAlert: true, tier: 3,
      threat: { level: 'high', category: 'cyber', confidence: 0.91, source: 'ml' },
      lat: 51.9, lon: 4.4, locationName: 'Port of Rotterdam – Netherlands', lang: 'en',
      importanceScore: 91, corroborationCount: 6, storyMeta: { firstSeen: Date.now() - 10800000, mentionCount: 19, sourceCount: 7, phase: 'developing' },
      velocity: { sourcesPerHour: 11, level: 'spike', trend: 'rising', sentiment: 'negative', sentimentScore: -0.55 },
      tags: ['ALERT', 'CYBER', 'INFRASTRUCTURE'],
    },
    {
      id: 'demo-5', source: 'BBC World',
      title: 'Iran Seizes Oil Tanker in Strait of Hormuz Amid Escalating Tensions',
      link: 'https://bbc.com/', snippet: 'IRGC naval forces boarded a Marshall Islands-flagged vessel citing \'violations of maritime environmental laws\'.',
      pubDate: hrsAgo(5), fetchedAt: hrsAgo(4.8), isAlert: true, tier: 1,
      threat: { level: 'critical', category: 'conflict', confidence: 0.95, source: 'keyword' },
      lat: 26.5, lon: 56.3, locationName: 'Strait of Hormuz – Iran', lang: 'en',
      importanceScore: 97, corroborationCount: 10, storyMeta: { firstSeen: Date.now() - 18000000, mentionCount: 38, sourceCount: 9, phase: 'sustained' },
      velocity: { sourcesPerHour: 16, level: 'elevated', trend: 'stable', sentiment: 'negative', sentimentScore: -0.5 },
      tags: ['ALERT', 'CONFLICT', 'ENERGY'],
    },
    {
      id: 'demo-6', source: 'Al Jazeera',
      title: 'Russia Deploys Advanced S-400 Batteries Along Arctic Shipping Route',
      link: 'https://aljazeera.com/', snippet: 'Moscow strengthens Northern Fleet defenses as melting ice opens new strategic trade corridors.',
      pubDate: hrsAgo(6), fetchedAt: hrsAgo(5.9), isAlert: false, tier: 2,
      threat: { level: 'medium', category: 'military', confidence: 0.85, source: 'ml' },
      lat: 73.5, lon: 80.1, locationName: 'Northern Sea Route – Russian Arctic', lang: 'en',
      importanceScore: 82, corroborationCount: 5, storyMeta: { firstSeen: Date.now() - 21600000, mentionCount: 15, sourceCount: 5, phase: 'developing' },
      velocity: { sourcesPerHour: 6, level: 'normal', trend: 'rising', sentiment: 'neutral', sentimentScore: -0.05 },
      tags: ['MILITARY', 'ARCTIC'],
    },
    {
      id: 'demo-7', source: 'Financial Times',
      title: 'Global Shipping Costs Surge 40% as Red Sea Crisis Forces Rerouting Around Africa',
      link: 'https://ft.com/', snippet: 'Maersk and CMA CGM announce emergency fuel surcharges as Cape of Good Hope diversions become indefinite.',
      pubDate: hrsAgo(4), fetchedAt: hrsAgo(3.8), isAlert: false, tier: 2,
      threat: { level: 'medium', category: 'economic', confidence: 0.90, source: 'llm' },
      lat: -34.3, lon: 18.4, locationName: 'Cape of Good Hope – South Africa', lang: 'en',
      importanceScore: 86, corroborationCount: 8, storyMeta: { firstSeen: Date.now() - 14400000, mentionCount: 27, sourceCount: 9, phase: 'sustained' },
      velocity: { sourcesPerHour: 10, level: 'elevated', trend: 'stable', sentiment: 'negative', sentimentScore: -0.35 },
      tags: ['ECONOMIC', 'SHIPPING'],
    },
    {
      id: 'demo-8', source: 'TechCrunch',
      title: 'AI-Powered Maritime Surveillance Startup Secures $120M Defense Contract',
      link: 'https://techcrunch.com/', snippet: 'Startup uses satellite AIS data combined with machine learning to predict illegal fishing and smuggling patterns.',
      pubDate: hrsAgo(8), fetchedAt: hrsAgo(7.8), isAlert: false, tier: 3,
      threat: { level: 'low', category: 'tech', confidence: 0.80, source: 'ml' },
      lang: 'en', importanceScore: 71, corroborationCount: 3,
      storyMeta: { firstSeen: Date.now() - 28800000, mentionCount: 12, sourceCount: 4, phase: 'sustained' },
      velocity: { sourcesPerHour: 4, level: 'normal', trend: 'falling', sentiment: 'positive', sentimentScore: 0.45 },
      tags: ['TECH', 'AI/ML', 'DEFENSE'],
    },
    {
      id: 'demo-9', source: 'OilPrice.com',
      title: 'Oil Tankers Face New Insurance Restrictions in Persian Gulf Waters',
      link: 'https://oilprice.com/', snippet: 'Lloyd\'s Market Association raises war risk premiums for vessels transiting within 50nm of Iranian coastline.',
      pubDate: hrsAgo(10), fetchedAt: hrsAgo(9.7), isAlert: false, tier: 3,
      threat: { level: 'medium', category: 'economic', confidence: 0.87, source: 'keyword' },
      lat: 27.1, lon: 52.6, locationName: 'Persian Gulf', lang: 'en',
      importanceScore: 78, corroborationCount: 4, storyMeta: { firstSeen: Date.now() - 36000000, mentionCount: 14, sourceCount: 5, phase: 'sustained' },
      velocity: { sourcesPerHour: 5, level: 'normal', trend: 'stable', sentiment: 'negative', sentimentScore: -0.25 },
      tags: ['ENERGY', 'ECONOMIC', 'INSURANCE'],
    },
    {
      id: 'demo-10', source: 'France 24',
      title: 'EU Announces Naval Task Force for Gabon Coast Anti-Piracy Mission',
      link: 'https://france24.com/', snippet: 'Four EU nations contribute frigates to Operation Atalanta expansion following three hijacking incidents this month.',
      pubDate: hrsAgo(12), fetchedAt: hrsAgo(11.8), isAlert: false, tier: 2,
      threat: { level: 'high', category: 'crime', confidence: 0.83, source: 'keyword' },
      lat: 1.0, lon: 9.5, locationName: 'Gulf of Guinea – off Gabon coast', lang: 'en',
      importanceScore: 79, corroborationCount: 5, storyMeta: { firstSeen: Date.now() - 43200000, mentionCount: 16, sourceCount: 6, phase: 'sustained' },
      velocity: { sourcesPerHour: 5, level: 'normal', trend: 'stable', sentiment: 'negative', sentimentScore: -0.15 },
      tags: ['SECURITY', 'PIRACY'],
    },
    {
      id: 'demo-11', source: 'The Verge',
      title: 'Autonomous Container Ship Completes First Trans-Pacific Crossing Without Human Intervention',
      link: 'https://theverge.com/', snippet: 'Japanese vessel used only AI navigation systems and sensor arrays during the 12-day voyage from Yokohama to Long Beach.',
      pubDate: hrsAgo(14), fetchedAt: hrsAgo(13.9), isAlert: false, tier: 3,
      threat: { level: 'low', category: 'tech', confidence: 0.78, source: 'ml' },
      lat: 33.7, lon: -118.2, locationName: 'Port of Los Angeles – USA', lang: 'en',
      importanceScore: 73, corroborationCount: 4,
      storyMeta: { firstSeen: Date.now() - 50400000, mentionCount: 18, sourceCount: 7, phase: 'fading' },
      velocity: { sourcesPerHour: 3, level: 'normal', trend: 'falling', sentiment: 'positive', sentimentScore: 0.60 },
      tags: ['TECH', 'AI/ML', 'AUTONOMOUS'],
    },
    {
      id: 'demo-12', source: 'CNBC',
      title: 'Panama Canal Authority Implements Further Transit Restrictions Due to Drought',
      link: 'https://cnbc.com/', snippet: 'Daily vessel slots reduced to 24 as water levels hit historic lows affecting global supply chains.',
      pubDate: hrsAgo(16), fetchedAt: hrsAgo(15.8), isAlert: true, tier: 2,
      threat: { level: 'medium', category: 'environmental', confidence: 0.93, source: 'keyword' },
      lat: 9.1, lon: -79.5, locationName: 'Panama Canal', lang: 'en',
      importanceScore: 84, corroborationCount: 7,
      storyMeta: { firstSeen: Date.now() - 57600000, mentionCount: 29, sourceCount: 10, phase: 'sustained' },
      velocity: { sourcesPerHour: 7, level: 'elevated', trend: 'stable', sentiment: 'negative', sentimentScore: -0.30 },
      tags: ['ALERT', 'DISASTER', 'LOGISTICS'],
    },
  ];

  const byCategory = new Map<string, NewsItem[]>();
  byCategory.set('world', [items[0], items[1], items[4], items[5]]);
  byCategory.set('us', []);
  byCategory.set('europe', [items[3], items[9]]);
  byCategory.set('middle_east', [items[1], items[4], items[8]]);
  byCategory.set('africa', [items[9]]);
  byCategory.set('latin_america', [items[11]]);
  byCategory.set('asia_pacific', [items[2], items[10]]);
  byCategory.set('financial', [items[6], items[8]]);
  byCategory.set('tech', [items[7], items[10]]);
  byCategory.set('energy', [items[4], items[8], items[11]]);
  byCategory.set('security', [items[0], items[2], items[3]]);

  return {
    items,
    byCategory,
    breakingAlerts: items.filter(i => i.isAlert),
    totalSources: RSS_FEEDS.length,
    fetchTime: 0.08,
  };
}

// State
interface AggregationState {
  items: Map<string, NewsItem>;
  byCategory: Map<string, NewsItem[]>;
  lastFetch: Date | null;
  isFetching: boolean;
}

const state: AggregationState = {
  items: new Map(),
  byCategory: new Map(),
  lastFetch: null,
  isFetching: false,
};

// Categories for display (WorldMonitor style)
export const DISPLAY_CATEGORIES = [
  { id: 'world', name: 'WORLD NEWS', icon: '✈️' },
  { id: 'us', name: 'UNITED STATES', icon: '🇺🇸' },
  { id: 'europe', name: 'EUROPE', icon: '🇪🇺' },
  { id: 'middle_east', name: 'MIDDLE EAST', icon: '🔥' },
  { id: 'africa', name: 'AFRICA', icon: '🌍' },
  { id: 'latin_america', name: 'LATIN AMERICA', icon: '🌎' },
  { id: 'asia_pacific', name: 'ASIA-PACIFIC', icon: '🌏' },
  { id: 'financial', name: 'FINANCIAL', icon: '💰' },
  { id: 'tech', name: 'AI/ML', icon: '🤖' },
  { id: 'energy', name: 'ENERGY & RESOURCES', icon: '⛽' },
  { id: 'security', name: 'SECURITY', icon: '🔒' },
];

export function getThreatColor(level: string): string {
  switch (level) {
    case 'critical': return '#ff3333';
    case 'high': return '#ff8800';
    case 'medium': return '#ffcc00';
    case 'low': return '#4488ff';
    case 'info': return '#888888';
    default: return '#888888';
  }
}

export function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    'ALERT': '#ff3333',
    'ONGOING': '#4488ff',
    'CAUTION': '#ff8800',
    'CONFLICT': '#ff3333',
    'CRIME': '#aa66ff',
    'DISASTER': '#ff8800',
    'ECONOMIC': '#44aa88',
    'TECH': '#4488ff',
    'CYBER': '#ff00ff',
    'WORLD': '#64c8ff',
    'US': '#4ecdc4',
    'EUROPE': '#96ceb4',
    'MIDDLE_EAST': '#ff6b6b',
    'AFRICA': '#feca57',
    'ASIA_PACIFIC': '#48dbfb',
    'LATIN_AMERICA': '#ff9ff3',
    'FINANCIAL': '#54a0ff',
    'ENERGY': '#00d2d3',
    'SECURITY': '#5f27cd',
  };
  return colors[tag] || '#666666';
}

// Local cache helpers
function getCachedNews(key: string): { data: AggregationResult; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(`news-cache:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Parse dates back from strings
    parsed.data.items = parsed.data.items.map((item: any) => ({
      ...item,
      pubDate: new Date(item.pubDate),
      fetchedAt: new Date(item.fetchedAt),
    }));
    parsed.data.breakingAlerts = parsed.data.breakingAlerts.map((item: any) => ({
      ...item,
      pubDate: new Date(item.pubDate),
      fetchedAt: new Date(item.fetchedAt),
    }));
    if (parsed.data.byCategory) {
      const catMap = new Map<string, NewsItem[]>();
      Object.entries(parsed.data.byCategory).forEach(([key, items]: [string, any]) => {
        catMap.set(key, items.map((item: any) => ({
          ...item,
          pubDate: new Date(item.pubDate),
          fetchedAt: new Date(item.fetchedAt),
        })));
      });
      parsed.data.byCategory = catMap;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedNews(key: string, data: AggregationResult): void {
  try {
    // Convert Map to plain object for serialization
    const byCategoryObj: Record<string, NewsItem[]> = {};
    data.byCategory.forEach((items, catKey) => {
      byCategoryObj[catKey] = items;
    });

    localStorage.setItem(`news-cache:${key}`, JSON.stringify({
      data: { ...data, byCategory: byCategoryObj },
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function aggregateAllNews(category?: string): Promise<AggregationResult> {
  if (state.isFetching) {
    return getCurrentState();
  }

  const cacheKey = `news:digest:${category || 'all'}`;

  // Check localStorage cache first
  const cached = getCachedNews(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[News] Returning cached data from localStorage');
    // Update state with cached data
    state.items.clear();
    cached.data.items.forEach(item => state.items.set(item.id, item));
    state.byCategory = cached.data.byCategory;
    state.lastFetch = new Date(cached.timestamp);
    return cached.data;
  }

  state.isFetching = true;

  try {
    // Fetch from backend API with a larger timeout (news fan-out can take >15s)
    const url = new URL(`${BACKEND_URL}/api/news`, window.location.origin);
    if (category) url.searchParams.set('category', category);

    let response: Response;
    try {
      response = await fetchWithTimeout(url.toString(), REQUEST_TIMEOUT_MS);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // One retry on timeout
        response = await fetchWithTimeout(url.toString(), REQUEST_TIMEOUT_MS);
      } else {
        throw error;
      }
    }

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    // Convert backend response to our format
    const allItems: NewsItem[] = data.items.map((item: any) => ({
      ...item,
      pubDate: new Date(item.pubDate),
      fetchedAt: new Date(item.fetchedAt),
    }));

    // Convert byCategory object to Map
    const byCategory = new Map<string, NewsItem[]>();
    for (const [key, items] of Object.entries(data.byCategory as Record<string, any[]>)) {
      byCategory.set(key, items.map((item: any) => ({
        ...item,
        pubDate: new Date(item.pubDate),
        fetchedAt: new Date(item.fetchedAt),
      })));
    }

    state.items.clear();
    allItems.forEach(item => state.items.set(item.id, item));
    state.byCategory = byCategory;
    state.lastFetch = new Date();

    const breakingAlerts = data.breakingAlerts.map((item: any) => ({
      ...item,
      pubDate: new Date(item.pubDate),
      fetchedAt: new Date(item.fetchedAt),
    }));

    const result: AggregationResult = {
      items: allItems,
      byCategory,
      breakingAlerts,
      totalSources: data.totalSources,
      fetchTime: data.fetchTime,
    };

    // Save to localStorage
    setCachedNews(cacheKey, result);

    console.log(`[News] Fetched ${allItems.length} items from backend${data.cached ? ' (cached)' : ''}`);

    return result;

  } catch (error) {
    console.error('[News] Backend fetch failed:', error);

    // If we have cached data, return it even if expired
    if (cached) {
      console.log('[News] Returning stale cached data');
      return cached.data;
    }

    // Fallback to built-in demo data for standalone / hackathon deployments
    console.log('[News] Backend unavailable — returning demo intelligence data');
    const demo = getDemoNews();
    setCachedNews(cacheKey, demo);
    return demo;

    /* Original errors preserved as comments:
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Live feed timed out while loading. Please try again in a few seconds.');
    }
    throw new Error('Failed to fetch live intelligence data. Please ensure the backend server is running.');
    */
  } finally {
    state.isFetching = false;
  }
}

function getCurrentState(): AggregationResult {
  const items = Array.from(state.items.values());
  return {
    items,
    byCategory: state.byCategory,
    breakingAlerts: items.filter(i => i.isAlert).slice(0, 10),
    totalSources: RSS_FEEDS.length,
    fetchTime: 0,
  };
}

export async function fetchNews(category?: string): Promise<AggregationResult> {
  return aggregateAllNews(category);
}

export async function fetchNewsDigest(category?: string): Promise<{
  categories: Record<string, NewsItem[]>;
  generatedAt: string;
  totalItems: number;
}> {
  const cacheKey = `news:digest:${category || 'all'}`;

  // Check cache
  const cached = getCachedNews(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const byCategory: Record<string, NewsItem[]> = {};
    cached.data.byCategory.forEach((items, key) => {
      byCategory[key] = items;
    });
    return {
      categories: byCategory,
      generatedAt: cached.data.items[0]?.fetchedAt?.toISOString() || new Date().toISOString(),
      totalItems: cached.data.items.length,
    };
  }

  const url = new URL(`${BACKEND_URL}/api/news/digest`, window.location.origin);
  if (category) url.searchParams.set('category', category);

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString(), REQUEST_TIMEOUT_MS);
  } catch {
    // Backend unreachable — fall back to demo data
    console.log('[News] Digest fetch failed — returning demo data');
    const demo = getDemoNews();
    const byCategory: Record<string, NewsItem[]> = {};
    demo.byCategory.forEach((items, key) => { byCategory[key] = items; });
    return { categories: byCategory, generatedAt: new Date().toISOString(), totalItems: demo.items.length };
  }

  if (!response.ok) {
    // Fall back to demo data
    console.log('[News] Digest returned error — returning demo data');
    const demo = getDemoNews();
    const byCategory: Record<string, NewsItem[]> = {};
    demo.byCategory.forEach((items, key) => { byCategory[key] = items; });
    return { categories: byCategory, generatedAt: new Date().toISOString(), totalItems: demo.items.length };
  }

  const data = await response.json();

  // Convert dates
  Object.keys(data.categories).forEach((key) => {
    data.categories[key] = data.categories[key].map((item: any) => ({
      ...item,
      pubDate: new Date(item.pubDate),
      fetchedAt: new Date(item.fetchedAt),
    }));
  });

  return data;
}

export function getNewsByCategory(categoryId: string): NewsItem[] {
  return state.byCategory.get(categoryId) || [];
}

export function getAllNews(): NewsItem[] {
  return Array.from(state.items.values());
}

export function formatTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    'BBC World': '#bb1919',
    'Reuters World': '#ff6b6b',
    'AP News': '#dc3545',
    'Al Jazeera': '#ff6b35',
    'France 24': '#00a8e8',
    'Defense One': '#1a237e',
    'SecurityWeek': '#6b4c9a',
    'Financial Times': '#fff1e5',
    'CNBC': '#0078d4',
    'TechCrunch': '#0f9d58',
    'OilPrice.com': '#00d2d3',
    'NPR': '#005f6a',
    'Euronews': '#003399',
    'South China Morning Post': '#1a4b8c',
    'Middle East Eye': '#2e7d32',
    'Hacker News': '#ff6600',
    'The Verge': '#e2127a',
    'Dark Reading': '#000000',
    'Yahoo Finance': '#6001d2',
    'PBS Newshour': '#2638c4',
  };
  return colors[source] || '#64c8ff';
}

// Clear cache (useful for debugging)
export function clearNewsCache(): void {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('news-cache:')) {
      localStorage.removeItem(key);
    }
  });
  state.items.clear();
  state.byCategory.clear();
  state.lastFetch = null;
}
