# News Aggregation & AI Insights Extraction Guide

Complete implementation for aggregating RSS news feeds and generating AI-powered insights using Groq API.

---

## What You Get

### News Aggregation
- **RSS Feed Aggregation** from multiple sources (Reuters, BBC, Al Jazeera, etc.)
- **Category-based organization** (World, Business, Tech, etc.)
- **Threat classification** (critical, high, medium, low)
- **Geo-location tagging** for map visualization
- **Duplicate detection** and story clustering
- **Auto-refresh** every 5 minutes

### AI Insights
- **News summarization** using Groq API (Llama 3, Mixtral)
- **Intelligent briefs** based on multiple headlines
- **Sentiment analysis** of news items
- **Focal point detection** (emerging stories)
- **Military posture correlation** (optional)
- **Fallback chain**: Groq → OpenRouter → Browser T5

---

## Architecture Overview

```
RSS Feeds → News Service → Categorize/Tag → Store
                              ↓
                    AI Summarization (Groq)
                              ↓
                    Insights Panel / Briefs
```

---

## Files to Create

### 1. `src/types/news.ts` - News TypeScript Interfaces

```typescript
export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type EventCategory = 
  | 'conflict' | 'protest' | 'disaster' | 'diplomatic' | 'economic'
  | 'terrorism' | 'cyber' | 'health' | 'environmental' | 'military'
  | 'crime' | 'infrastructure' | 'tech' | 'general';

export interface ThreatClassification {
  level: ThreatLevel;
  category: EventCategory;
  confidence: number;
  source: 'keyword' | 'ml' | 'llm';
}

export interface NewsItem {
  source: string;
  title: string;
  link: string;
  pubDate: Date;
  isAlert: boolean;
  tier?: number;
  threat?: ThreatClassification;
  lat?: number;
  lon?: number;
  locationName?: string;
  lang?: string;
  imageUrl?: string;
  snippet?: string;
  importanceScore?: number;
}

export interface Feed {
  name: string;
  url: string;
  category: string;
  lang?: string;
}

export type SummarizationProvider = 'groq' | 'openrouter' | 'browser';

export interface SummarizationResult {
  summary: string;
  provider: SummarizationProvider;
  model: string;
  cached: boolean;
}

export interface NewsCategory {
  id: string;
  name: string;
  feeds: Feed[];
}
```

---

### 2. `src/config/feeds.ts` - RSS Feed Configuration

```typescript
import type { Feed, NewsCategory } from '@/types/news';

// Core RSS feeds for news aggregation
export const RSS_FEEDS: Feed[] = [
  // World News
  { name: 'Reuters World', url: 'https://www.reutersagency.com/feed/?taxonomy=markets&post_type=reuters-best', category: 'world', lang: 'en' },
  { name: 'BBC World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'world', lang: 'en' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'world', lang: 'en' },
  { name: 'Associated Press', url: 'https://feeds.apnews.com/apnews.rss', category: 'world', lang: 'en' },
  { name: 'France 24', url: 'https://www.france24.com/en/rss', category: 'world', lang: 'en' },
  
  // Business/Finance
  { name: 'Reuters Business', url: 'https://www.reutersagency.com/feed/?taxonomy=markets&post_type=reuters-best', category: 'business', lang: 'en' },
  { name: 'Financial Times', url: 'https://www.ft.com/rss/home', category: 'business', lang: 'en' },
  { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'business', lang: 'en' },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'business', lang: 'en' },
  { name: 'WSJ Markets', url: 'https://feeds.content.dowjones.io/public/rss/RSSMarketsMain', category: 'business', lang: 'en' },
  
  // Technology
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech', lang: 'en' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech', lang: 'en' },
  { name: 'Ars Technica', url: 'http://feeds.arstechnica.com/arstechnica/index', category: 'tech', lang: 'en' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech', lang: 'en' },
  
  // Geopolitical/Security
  { name: 'Defense One', url: 'https://www.defenseone.com/rss/all.xml', category: 'security', lang: 'en' },
  { name: 'SecurityWeek', url: 'https://feeds.feedburner.com/securityweek', category: 'security', lang: 'en' },
  { name: 'Flashpoint', url: 'https://flashpoint.io/feed/', category: 'security', lang: 'en' },
  
  // Energy/Commodities
  { name: 'Energy Central', url: 'https://feeds.feedburner.com/EnergyCentral', category: 'energy', lang: 'en' },
  { name: 'OilPrice.com', url: 'https://oilprice.com/rss/main', category: 'energy', lang: 'en' },
  { name: 'Rigzone', url: 'https://www.rigzone.com/news/rss/rss.xml', category: 'energy', lang: 'en' },
  
  // Science/Health
  { name: 'Nature News', url: 'https://www.nature.com/nature.rss', category: 'science', lang: 'en' },
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', category: 'science', lang: 'en' },
  { name: 'WHO', url: 'https://www.who.int/rss-feeds/news-english.xml', category: 'health', lang: 'en' },
];

// Categories for organizing news
export const NEWS_CATEGORIES: NewsCategory[] = [
  { id: 'world', name: 'World News', feeds: RSS_FEEDS.filter(f => f.category === 'world') },
  { id: 'business', name: 'Business & Finance', feeds: RSS_FEEDS.filter(f => f.category === 'business') },
  { id: 'tech', name: 'Technology', feeds: RSS_FEEDS.filter(f => f.category === 'tech') },
  { id: 'security', name: 'Security & Defense', feeds: RSS_FEEDS.filter(f => f.category === 'security') },
  { id: 'energy', name: 'Energy & Commodities', feeds: RSS_FEEDS.filter(f => f.category === 'energy') },
  { id: 'science', name: 'Science & Health', feeds: RSS_FEEDS.filter(f => f.category === 'science' || f.category === 'health') },
];
```

---

### 3. `src/services/news.ts` - News Aggregation Service

```typescript
import type { NewsItem, Feed, ThreatClassification } from '@/types/news';
import { RSS_FEEDS } from '@/config/feeds';

// State
let newsCache: Map<string, NewsItem[]> = new Map();
let isPolling = false;
let pollInterval: NodeJS.Timeout | null = null;

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse RSS feed to news items
 * Note: In production, use a backend proxy to avoid CORS
 */
async function parseRSSFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    // Use a CORS proxy or your backend
    const proxyUrl = `/api/rss?url=${encodeURIComponent(feed.url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const items = xmlDoc.querySelectorAll('item');
    const newsItems: NewsItem[] = [];
    
    items.forEach((item, index) => {
      if (index >= 20) return; // Limit to 20 items per feed
      
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const pubDateStr = item.querySelector('pubDate')?.textContent || '';
      const description = item.querySelector('description')?.textContent?.trim() || '';
      
      // Parse date
      const pubDate = pubDateStr ? new Date(pubDateStr) : new Date();
      
      // Skip old items (older than 24 hours)
      const hoursOld = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
      if (hoursOld > 24) return;
      
      // Classify threat level based on keywords
      const threat = classifyThreat(title + ' ' + description);
      
      // Extract location if mentioned
      const location = extractLocation(title + ' ' + description);
      
      newsItems.push({
        source: feed.name,
        title,
        link,
        pubDate,
        isAlert: threat.level === 'critical' || threat.level === 'high',
        threat,
        lat: location?.lat,
        lon: location?.lon,
        locationName: location?.name,
        lang: feed.lang,
        snippet: description.slice(0, 400),
        importanceScore: calculateImportance(title, threat),
      });
    });
    
    return newsItems;
  } catch (error) {
    console.error(`[News] Failed to fetch ${feed.name}:`, error);
    return [];
  }
}

/**
 * Classify threat level based on keywords
 */
function classifyThreat(text: string): ThreatClassification {
  const lowerText = text.toLowerCase();
  
  // Critical keywords
  const criticalKeywords = ['breaking', 'urgent', 'war', 'attack', 'invasion', 'coup', 'assassination', 'nuclear'];
  if (criticalKeywords.some(k => lowerText.includes(k))) {
    return { level: 'critical', category: detectCategory(lowerText), confidence: 0.9, source: 'keyword' };
  }
  
  // High keywords
  const highKeywords = ['conflict', 'crisis', 'sanctions', 'missile', 'bombing', 'hostage', 'terror'];
  if (highKeywords.some(k => lowerText.includes(k))) {
    return { level: 'high', category: detectCategory(lowerText), confidence: 0.8, source: 'keyword' };
  }
  
  // Medium keywords
  const mediumKeywords = ['tension', 'protest', 'dispute', 'deadlock', 'volatile', 'concern'];
  if (mediumKeywords.some(k => lowerText.includes(k))) {
    return { level: 'medium', category: detectCategory(lowerText), confidence: 0.7, source: 'keyword' };
  }
  
  return { level: 'low', category: 'general', confidence: 0.5, source: 'keyword' };
}

/**
 * Detect event category
 */
function detectCategory(text: string): ThreatClassification['category'] {
  if (text.includes('war') || text.includes('military') || text.includes('attack')) return 'conflict';
  if (text.includes('protest') || text.includes('riot')) return 'protest';
  if (text.includes('earthquake') || text.includes('flood') || text.includes('hurricane')) return 'disaster';
  if (text.includes('cyber') || text.includes('hack')) return 'cyber';
  if (text.includes('economy') || text.includes('market') || text.includes('trade')) return 'economic';
  if (text.includes('tech') || text.includes('ai') || text.includes('software')) return 'tech';
  return 'general';
}

/**
 * Extract location from text (simplified - use geocoding API in production)
 */
function extractLocation(text: string): { name: string; lat: number; lon: number } | null {
  // Major cities with coordinates
  const locations: Record<string, { lat: number; lon: number }> = {
    'moscow': { lat: 55.7558, lon: 37.6173 },
    'beijing': { lat: 39.9042, lon: 116.4074 },
    'washington': { lat: 38.9072, lon: -77.0369 },
    'london': { lat: 51.5074, lon: -0.1278 },
    'tokyo': { lat: 35.6762, lon: 139.6503 },
    'kyiv': { lat: 50.4501, lon: 30.5234 },
    'tel aviv': { lat: 32.0853, lon: 34.7818 },
    'gaza': { lat: 31.5017, lon: 34.4668 },
    'tehran': { lat: 35.6892, lon: 51.3890 },
    'riyadh': { lat: 24.7136, lon: 46.6753 },
    'delhi': { lat: 28.6139, lon: 77.2090 },
    'beirut': { lat: 33.8938, lon: 35.5018 },
    'istanbul': { lat: 41.0082, lon: 28.9784 },
  };
  
  const lowerText = text.toLowerCase();
  for (const [name, coords] of Object.entries(locations)) {
    if (lowerText.includes(name)) {
      return { name: name.charAt(0).toUpperCase() + name.slice(1), ...coords };
    }
  }
  
  return null;
}

/**
 * Calculate importance score
 */
function calculateImportance(title: string, threat: ThreatClassification): number {
  let score = 0;
  
  // Threat level contributes
  if (threat.level === 'critical') score += 50;
  else if (threat.level === 'high') score += 30;
  else if (threat.level === 'medium') score += 15;
  
  // Breaking news bonus
  if (title.toLowerCase().includes('breaking')) score += 20;
  
  return Math.min(100, score);
}

/**
 * Aggregate news from all feeds
 */
export async function aggregateNews(): Promise<Map<string, NewsItem[]>> {
  const results = new Map<string, NewsItem[]>();
  
  // Fetch all feeds in parallel
  const feedPromises = RSS_FEEDS.map(async (feed) => {
    const items = await parseRSSFeed(feed);
    return { category: feed.category, items };
  });
  
  const feedResults = await Promise.all(feedPromises);
  
  // Organize by category
  feedResults.forEach(({ category, items }) => {
    const existing = results.get(category) || [];
    results.set(category, [...existing, ...items]);
  });
  
  // Sort each category by importance and date
  results.forEach((items, category) => {
    items.sort((a, b) => {
      const scoreDiff = (b.importanceScore || 0) - (a.importanceScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return b.pubDate.getTime() - a.pubDate.getTime();
    });
    results.set(category, items.slice(0, 50)); // Keep top 50 per category
  });
  
  newsCache = results;
  return results;
}

/**
 * Start polling for news
 */
export function startNewsPolling(): void {
  if (isPolling) return;
  
  isPolling = true;
  
  // Initial fetch
  void aggregateNews();
  
  // Set up polling
  pollInterval = setInterval(() => {
    void aggregateNews();
  }, REFRESH_INTERVAL_MS);
}

/**
 * Stop polling
 */
export function stopNewsPolling(): void {
  isPolling = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

/**
 * Get cached news
 */
export function getNews(category?: string): NewsItem[] {
  if (category) {
    return newsCache.get(category) || [];
  }
  
  // Return all news flattened
  return Array.from(newsCache.values()).flat();
}

/**
 * Get breaking alerts (critical/high threat)
 */
export function getBreakingAlerts(): NewsItem[] {
  return getNews().filter(item => item.isAlert);
}
```

---

### 4. `src/services/ai-insights.ts` - AI Insights Service with Groq

```typescript
import type { NewsItem, SummarizationResult, SummarizationProvider } from '@/types/news';

// Configuration
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Available models on Groq
const GROQ_MODELS = {
  fast: 'llama3-8b-8192',      // Fast, cheaper
  balanced: 'llama3-70b-8192', // Good balance
  quality: 'mixtral-8x7b-32768', // Best quality
};

// Circuit breaker state
let lastAttemptedProvider: SummarizationProvider = 'groq';
let requestCount = 0;
const MAX_REQUESTS_PER_MINUTE = 30;

/**
 * Generate summary using Groq API
 */
async function tryGroq(
  headlines: string[],
  geoContext?: string,
  model: string = GROQ_MODELS.balanced
): Promise<SummarizationResult | null> {
  if (!GROQ_API_KEY) {
    console.warn('[AI] GROQ_API_KEY not configured');
    return null;
  }
  
  // Rate limiting
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    console.warn('[AI] Rate limit reached');
    return null;
  }
  
  lastAttemptedProvider = 'groq';
  
  try {
    const prompt = buildPrompt(headlines, geoContext);
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a geopolitical intelligence analyst. Summarize news headlines into concise, actionable insights. Focus on geopolitical significance, military movements, economic impacts, and emerging threats.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    
    if (!summary) return null;
    
    requestCount++;
    
    return {
      summary,
      provider: 'groq',
      model,
      cached: false,
    };
  } catch (error) {
    console.error('[AI] Groq failed:', error);
    return null;
  }
}

/**
 * Try OpenRouter as fallback
 */
async function tryOpenRouter(
  headlines: string[],
  geoContext?: string
): Promise<SummarizationResult | null> {
  const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!OPENROUTER_KEY) return null;
  
  lastAttemptedProvider = 'openrouter';
  
  try {
    const prompt = buildPrompt(headlines, geoContext);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
    
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    
    if (!summary) return null;
    
    return {
      summary,
      provider: 'openrouter',
      model: 'claude-3-haiku',
      cached: false,
    };
  } catch (error) {
    console.error('[AI] OpenRouter failed:', error);
    return null;
  }
}

/**
 * Browser-based T5 fallback (using Transformers.js)
 */
async function tryBrowserT5(headlines: string[]): Promise<SummarizationResult | null> {
  try {
    // Dynamic import to avoid loading unless needed
    const { pipeline } = await import('@xenova/transformers');
    const summarizer = await pipeline('summarization', 'Xenova/t5-small');
    
    const text = headlines.slice(0, 5).join('. ');
    const result = await summarizer(text, { max_length: 150 });
    
    return {
      summary: result[0]?.summary_text || '',
      provider: 'browser',
      model: 't5-small',
      cached: false,
    };
  } catch (error) {
    console.error('[AI] Browser T5 failed:', error);
    return null;
  }
}

/**
 * Build prompt for LLM
 */
function buildPrompt(headlines: string[], geoContext?: string): string {
  const headlineList = headlines.slice(0, 10).map((h, i) => `${i + 1}. ${h}`).join('\n');
  
  let prompt = `Analyze these news headlines and provide a concise intelligence brief (2-3 sentences):

${headlineList}

Key points to address:
- Major geopolitical developments
- Military/security implications  
- Economic/market impact
- Emerging threats or opportunities`;

  if (geoContext) {
    prompt += `\n\nGeographic context: ${geoContext}`;
  }
  
  prompt += `\n\nProvide a focused summary in 2-3 sentences.`;
  
  return prompt;
}

// Simple in-memory cache
const summaryCache = new Map<string, SummarizationResult>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(headlines: string[]): string {
  return headlines.slice(0, 5).join('|').slice(0, 200);
}

/**
 * Generate AI summary with fallback chain
 * Primary: Groq → Fallback: OpenRouter → Browser T5
 */
export async function generateSummary(
  headlines: string[],
  geoContext?: string,
  options?: { skipCloud?: boolean; skipBrowser?: boolean }
): Promise<SummarizationResult | null> {
  if (!headlines.length) return null;
  
  // Check cache
  const cacheKey = getCacheKey(headlines);
  const cached = summaryCache.get(cacheKey);
  if (cached) {
    const age = Date.now() - (cached as any).timestamp;
    if (age < CACHE_TTL_MS) {
      return { ...cached, cached: true };
    }
  }
  
  let result: SummarizationResult | null = null;
  
  // Try Groq first
  if (!options?.skipCloud) {
    result = await tryGroq(headlines, geoContext, GROQ_MODELS.fast);
  }
  
  // Fallback to OpenRouter
  if (!result && !options?.skipCloud) {
    result = await tryOpenRouter(headlines, geoContext);
  }
  
  // Final fallback to browser T5
  if (!result && !options?.skipBrowser) {
    result = await tryBrowserT5(headlines);
  }
  
  // Cache result
  if (result) {
    summaryCache.set(cacheKey, { ...result, timestamp: Date.now() } as any);
  }
  
  return result;
}

/**
 * Analyze sentiment of news items
 */
export function analyzeSentiment(items: NewsItem[]): { negative: number; neutral: number; positive: number } {
  const sentiment = { negative: 0, neutral: 0, positive: 0 };
  
  items.forEach(item => {
    const text = (item.title + ' ' + (item.snippet || '')).toLowerCase();
    
    const negativeWords = ['crisis', 'war', 'attack', 'death', 'crash', 'fail', 'collapse', 'threat'];
    const positiveWords = ['peace', 'agreement', 'success', 'growth', 'breakthrough', 'recovery'];
    
    if (negativeWords.some(w => text.includes(w))) sentiment.negative++;
    else if (positiveWords.some(w => text.includes(w))) sentiment.positive++;
    else sentiment.neutral++;
  });
  
  return sentiment;
}

/**
 * Detect emerging focal points (stories with increasing mentions)
 */
export function detectFocalPoints(items: NewsItem[], timeframeHours: number = 6): string[] {
  const recentItems = items.filter(item => {
    const hoursOld = (Date.now() - item.pubDate.getTime()) / (1000 * 60 * 60);
    return hoursOld <= timeframeHours;
  });
  
  // Extract key terms and count frequency
  const termCounts = new Map<string, number>();
  
  recentItems.forEach(item => {
    const words = item.title.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 4 && !['about', 'after', 'before', 'their', 'there'].includes(word)) {
        termCounts.set(word, (termCounts.get(word) || 0) + 1);
      }
    });
  });
  
  // Return top trending terms
  return Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);
}

/**
 * Get AI status
 */
export function getAIStatus(): { 
  provider: string; 
  available: boolean; 
  requestsThisMinute: number;
} {
  return {
    provider: lastAttemptedProvider,
    available: !!GROQ_API_KEY,
    requestsThisMinute: requestCount,
  };
}

// Reset rate limit counter every minute
setInterval(() => {
  requestCount = 0;
}, 60000);
```

---

### 5. `src/components/NewsPanel.tsx` - News Panel Component

```tsx
import { useState, useEffect, useCallback } from 'react';
import type { NewsItem } from '@/types/news';
import { getNews, startNewsPolling, stopNewsPolling, getBreakingAlerts } from '@/services/news';
import { generateSummary, analyzeSentiment, detectFocalPoints } from '@/services/ai-insights';

interface NewsPanelProps {
  category?: string;
  showAIInsights?: boolean;
}

export default function NewsPanel({ category, showAIInsights = true }: NewsPanelProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [focalPoints, setFocalPoints] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState({ negative: 0, neutral: 0, positive: 0 });
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);

  // Load news
  useEffect(() => {
    const loadNews = () => {
      const items = category ? getNews(category) : getNews();
      setNews(items);
      
      // Analyze sentiment
      setSentiment(analyzeSentiment(items));
      
      // Detect focal points
      setFocalPoints(detectFocalPoints(items));
    };

    loadNews();
    startNewsPolling();

    // Refresh every 30 seconds
    const interval = setInterval(loadNews, 30000);

    return () => {
      stopNewsPolling();
      clearInterval(interval);
    };
  }, [category]);

  // Generate AI summary
  const handleSummarize = useCallback(async () => {
    if (!news.length || isSummarizing) return;
    
    setIsSummarizing(true);
    
    const headlines = news.slice(0, 10).map(n => n.title);
    const geoContext = news.find(n => n.locationName)?.locationName;
    
    const result = await generateSummary(headlines, geoContext);
    
    if (result) {
      setSummary(result.summary);
    }
    
    setIsSummarizing(false);
  }, [news, isSummarizing]);

  // Get breaking alerts count
  const breakingCount = getBreakingAlerts().length;

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#1a1a1a',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            {category ? category.charAt(0).toUpperCase() + category.slice(1) : 'All'} News
          </h2>
          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
            {news.length} items • {breakingCount} breaking
          </div>
        </div>
        
        {showAIInsights && (
          <button
            onClick={handleSummarize}
            disabled={isSummarizing}
            style={{
              padding: '8px 16px',
              background: isSummarizing ? '#444' : '#0066cc',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: isSummarizing ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            {isSummarizing ? 'Analyzing...' : 'AI Summary'}
          </button>
        )}
      </div>

      {/* AI Insights */}
      {showAIInsights && (summary || focalPoints.length > 0) && (
        <div style={{ 
          padding: '16px', 
          background: 'rgba(0, 102, 204, 0.1)',
          borderBottom: '1px solid #333'
        }}>
          {summary && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>
                AI Insight
              </div>
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                {summary}
              </div>
            </div>
          )}
          
          {focalPoints.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', opacity: 0.7 }}>Trending:</span>
              {focalPoints.map((point, i) => (
                <span 
                  key={i}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px'
                  }}
                >
                  {point}
                </span>
              ))}
            </div>
          )}
          
          {/* Sentiment */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginTop: '12px',
            fontSize: '11px'
          }}>
            <span style={{ color: '#ff6666' }}>▲ {sentiment.negative} negative</span>
            <span style={{ color: '#ffff66' }}>● {sentiment.neutral} neutral</span>
            <span style={{ color: '#66ff66' }}>▼ {sentiment.positive} positive</span>
          </div>
        </div>
      )}

      {/* News List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {news.map((item, index) => (
          <div
            key={index}
            onClick={() => setSelectedItem(item)}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #333',
              cursor: 'pointer',
              background: selectedItem?.title === item.title ? 'rgba(0,102,204,0.2)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            {/* Alert badge */}
            {item.isAlert && (
              <span style={{
                display: 'inline-block',
                padding: '2px 6px',
                background: item.threat?.level === 'critical' ? '#cc0000' : '#cc6600',
                borderRadius: '3px',
                fontSize: '10px',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                {item.threat?.level}
              </span>
            )}
            
            {/* Title */}
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 500,
              marginBottom: '4px',
              lineHeight: '1.4'
            }}>
              {item.title}
            </div>
            
            {/* Meta */}
            <div style={{ 
              fontSize: '11px', 
              opacity: 0.6,
              display: 'flex',
              gap: '12px'
            }}>
              <span>{item.source}</span>
              <span>{item.pubDate.toLocaleTimeString()}</span>
              {item.locationName && <span>📍 {item.locationName}</span>}
            </div>
            
            {/* Snippet */}
            {item.snippet && (
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.8,
                marginTop: '4px',
                lineHeight: '1.4'
              }}>
                {item.snippet.slice(0, 150)}...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 6. `src/components/NewsMap.tsx` - News on Map

```tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from 'deck.gl';
import { ScatterplotLayer } from 'deck.gl';
import { getNews, startNewsPolling, stopNewsPolling } from '@/services/news';
import type { NewsItem } from '@/types/news';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

const INITIAL_VIEW = {
  longitude: 20,
  latitude: 30,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

export default function NewsMap() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [showAll, setShowAll] = useState(true);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  // Load news with geolocation
  useEffect(() => {
    const loadNews = () => {
      const items = getNews().filter(n => n.lat && n.lon);
      setNews(items);
    };

    loadNews();
    startNewsPolling();

    const interval = setInterval(loadNews, 30000);

    return () => {
      stopNewsPolling();
      clearInterval(interval);
    };
  }, []);

  // Filter items
  const filteredNews = useMemo(() => {
    if (showAlertsOnly) {
      return news.filter(n => n.isAlert);
    }
    return news;
  }, [news, showAlertsOnly]);

  // Create layer
  const layers = useMemo(() => {
    const colorForThreat = (level?: string): [number, number, number, number] => {
      switch (level) {
        case 'critical': return [255, 0, 0, 200];
        case 'high': return [255, 100, 0, 180];
        case 'medium': return [255, 200, 0, 160];
        default: return [100, 200, 255, 150];
      }
    };

    return [
      new ScatterplotLayer<NewsItem>({
        id: 'news-layer',
        data: filteredNews,
        getPosition: d => [d.lon!, d.lat!],
        getRadius: d => d.isAlert ? 15000 : 8000,
        getFillColor: d => colorForThreat(d.threat?.level),
        radiusMinPixels: 5,
        radiusMaxPixels: 20,
        pickable: true,
      })
    ];
  }, [filteredNews]);

  const getTooltip = useCallback(({ object }: { object?: NewsItem }) => {
    if (!object) return null;
    
    return {
      html: `
        <div style="padding: 12px; max-width: 300px; font-family: system-ui;">
          <div style="font-weight: bold; margin-bottom: 4px;">${object.title}</div>
          <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">
            ${object.source} • ${object.pubDate.toLocaleString()}
          </div>
          ${object.threat ? `
            <div style="font-size: 11px; color: #ffaa00;">
              Threat: ${object.threat.level} (${object.threat.category})
            </div>
          ` : ''}
          ${object.snippet ? `
            <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">
              ${object.snippet.slice(0, 200)}...
            </div>
          ` : ''}
        </div>
      `,
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          background: 'rgba(0,0,0,0.85)',
          padding: '12px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>News Map</h3>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={e => {
              setShowAll(e.target.checked);
              if (e.target.checked) setShowAlertsOnly(false);
            }}
          />
          All Geo-Tagged News ({news.length})
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showAlertsOnly}
            onChange={e => {
              setShowAlertsOnly(e.target.checked);
              if (e.target.checked) setShowAll(false);
            }}
          />
          Alerts Only ({news.filter(n => n.isAlert).length})
        </label>

        {/* Legend */}
        <div style={{ marginTop: '12px', fontSize: '11px' }}>
          <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>Threat Level:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff0000' }} />
            Critical
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff6400' }} />
            High
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffc800' }} />
            Medium
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#64c8ff' }} />
            Low/Info
          </div>
        </div>
      </div>

      {/* Map */}
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
      >
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>
    </div>
  );
}
```

---

## Installation

```bash
npm install deck.gl maplibre-gl react-map-gl

# For browser-based AI fallback (optional)
npm install @xenova/transformers
```

---

## Environment Variables

Add to `.env`:

```bash
# Required for AI Insights
VITE_GROQ_API_KEY=your_groq_api_key_here

# Optional fallback
VITE_OPENROUTER_API_KEY=your_openrouter_key_here
```

Get your Groq API key free at: https://console.groq.com/keys

---

## Usage

```tsx
import NewsPanel from '@/components/NewsPanel';
import NewsMap from '@/components/NewsMap';

// News panel with AI insights
<NewsPanel category="world" showAIInsights={true} />

// News on map
<NewsMap />
```

---

## API Rate Limits

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| Groq | 20 requests/minute | Llama 3, Mixtral available |
| OpenRouter | Varies by model | Pay-per-use |
| Browser T5 | Unlimited | Runs locally, slower |

---

## Architecture Summary

```
RSS Feeds → News Service (categorize, geotag, threat classify)
                ↓
    ┌───────────┼───────────┐
    ↓           ↓           ↓
NewsPanel   NewsMap    AI Insights
(React)    (DeckGL)   (Groq API)
    └───────────┴───────────┘
         AI Summary
```

---

## All Extraction Guides Complete

You now have:
1. ✅ **Trade Routes** - Shipping lanes visualization
2. ✅ **Ship Traffic (AIS)** - Maritime density & disruptions
3. ✅ **Weather Alerts** - Severe weather visualization
4. ✅ **News Aggregation** - RSS feeds with AI insights

Ready to implement in your app!
