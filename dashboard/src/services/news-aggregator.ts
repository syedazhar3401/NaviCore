import type { NewsItem, AggregationResult } from '@/types/news';
import { RSS_FEEDS } from '@/config/feeds';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4000`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 45000;

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

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Live feed timed out while loading. Please try again in a few seconds.');
    }

    throw new Error('Failed to fetch live intelligence data. Please ensure the backend server is running.');
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

  const response = await fetchWithTimeout(url.toString(), REQUEST_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Failed to fetch digest: ${response.status}`);
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
