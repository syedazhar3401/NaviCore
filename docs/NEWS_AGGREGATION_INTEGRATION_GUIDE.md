# News Aggregation System Integration Guide

> **Transfer the WorldMonitor news aggregation system to your own application**

This guide explains how to extract and integrate the real-time news aggregation system from WorldMonitor into your own app.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [RSS Feed Configuration](#rss-feed-configuration)
6. [Threat Classification](#threat-classification)
7. [Caching Strategy](#caching-strategy)
8. [Complete Code Example](#complete-code-example)
9. [Deployment](#deployment)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEWS AGGREGATION PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │  RSS Feeds  │────▶│   Server    │────▶│    Redis    │                   │
│  │  (60+ src)  │     │   Digest    │     │    Cache    │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                              │                       │                      │
│                              ▼                       ▼                      │
│                       ┌─────────────┐     ┌─────────────┐                   │
│                       │   Threat    │     │   Client    │                   │
│                       │ Classifier  │     │   Fetcher   │                   │
│                       └─────────────┘     └─────────────┘                   │
│                                                   │                         │
│                                                   ▼                         │
│                                          ┌─────────────┐                    │
│                                          │     UI      │                    │
│                                          │   Panels    │                    │
│                                          └─────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Server** fetches RSS feeds from 60+ sources every 15 minutes
2. **Classifier** analyzes each headline for threat level and category
3. **Deduplicator** groups similar stories using title hashing
4. **Cache** stores processed news in Redis (15-min TTL)
5. **Client** fetches digest via API endpoint
6. **Fallback** client can fetch individual feeds if server fails

---

## Prerequisites

### Required Services

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Upstash Redis** | Cross-user caching | 10k commands/day |
| **Vercel/Node.js** | API hosting | Hobby tier |
| **RSS Proxy** (optional) | Bypass CORS/blocks | Self-hosted |

### Environment Variables

```bash
# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Optional: Groq for AI classification
GROQ_API_KEY="gsk_..."
```

---

## Backend Implementation

### 1. RSS Feed Parser (Edge Function)

Create `api/news/digest.ts`:

```typescript
export const config = { runtime: 'edge' };

// Feed configuration
interface Feed {
  name: string;
  url: string;
  category: string;
  lang?: string;
}

const FEEDS: Feed[] = [
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world' },
  { name: 'Reuters', url: 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en-US', category: 'world' },
  { name: 'AP News', url: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US', category: 'world' },
  // Add more feeds...
];

// Parse RSS XML
function parseRssXml(xml: string, feed: Feed): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const matches = [...xml.matchAll(itemRegex)];

  for (const match of matches.slice(0, 5)) {
    const block = match[1]!;
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDateStr = extractTag(block, 'pubDate');
    
    if (!title) continue;
    
    const pubDate = new Date(pubDateStr);
    if (isNaN(pubDate.getTime())) continue;
    
    // Classify threat level
    const threat = classifyByKeyword(title);
    
    items.push({
      id: hashTitle(title),
      source: feed.name,
      title,
      link,
      pubDate,
      category: feed.category,
      threat,
      isAlert: threat.level === 'critical' || threat.level === 'high',
    });
  }
  
  return items;
}

// Extract XML tag content
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? decodeXmlEntities(match[1]!.trim()) : '';
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// Generate ID from title
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
```

### 2. Threat Classification

```typescript
// Threat levels and categories
type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
type EventCategory = 'conflict' | 'protest' | 'disaster' | 'diplomatic' | 'economic' | 'cyber' | 'general';

interface ThreatClassification {
  level: ThreatLevel;
  category: EventCategory;
  confidence: number;
}

// Keyword-based classification
const KEYWORD_GROUPS = [
  {
    keywords: ['breaking', 'urgent', 'war declared', 'invasion', 'coup', 'assassination', 'nuclear launch', 'missile attack'],
    level: 'critical' as ThreatLevel,
    category: 'conflict' as EventCategory,
    weight: 0.9
  },
  {
    keywords: ['airstrike', 'bombing', 'missile', 'troops deployed', 'invasion', 'siege', 'massacre'],
    level: 'high' as ThreatLevel,
    category: 'military' as EventCategory,
    weight: 0.8
  },
  {
    keywords: ['protest', 'demonstration', 'unrest', 'riot', 'curfew', 'martial law'],
    level: 'medium' as ThreatLevel,
    category: 'protest' as EventCategory,
    weight: 0.6
  },
  {
    keywords: ['hurricane', 'earthquake', 'flood', 'wildfire', 'tsunami', 'pandemic'],
    level: 'medium' as ThreatLevel,
    category: 'disaster' as EventCategory,
    weight: 0.65
  },
];

function classifyByKeyword(title: string): ThreatClassification {
  const lowerText = title.toLowerCase();
  let maxScore = 0;
  let bestMatch = null;
  
  for (const group of KEYWORD_GROUPS) {
    const matches = group.keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    if (matches.length > 0) {
      const score = group.weight * matches.length;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = group;
      }
    }
  }
  
  if (bestMatch) {
    return {
      level: bestMatch.level,
      category: bestMatch.category,
      confidence: Math.min(0.95, maxScore)
    };
  }
  
  return { level: 'info', category: 'general', confidence: 0.5 };
}
```

### 3. Main Digest Endpoint

```typescript
// Main handler
export default async function handler(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get('category') || 'all';
  
  // Check cache first
  const cacheKey = `news:digest:${category}`;
  const cached = await getFromRedis(cacheKey);
  if (cached) {
    return jsonResponse(cached);
  }
  
  // Fetch all feeds in parallel
  const feedsToFetch = category === 'all' 
    ? FEEDS 
    : FEEDS.filter(f => f.category === category);
  
  const results = await Promise.allSettled(
    feedsToFetch.map(feed => fetchFeed(feed))
  );
  
  // Collect successful results
  const allItems: NewsItem[] = [];
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    } else {
      console.error(`Failed to fetch ${feedsToFetch[idx].name}:`, result.reason);
    }
  });
  
  // Deduplicate by title hash
  const uniqueItems = deduplicateItems(allItems);
  
  // Sort by importance (newest first)
  uniqueItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  
  // Group by category
  const byCategory = groupByCategory(uniqueItems);
  
  const response = {
    categories: byCategory,
    generatedAt: new Date().toISOString(),
    totalItems: uniqueItems.length
  };
  
  // Cache for 15 minutes
  await saveToRedis(cacheKey, response, 900);
  
  return jsonResponse(response);
}

// Fetch single feed
async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xml = await response.text();
    return parseRssXml(xml, feed);
  } catch (error) {
    console.error(`Error fetching ${feed.name}:`, error);
    return [];
  }
}

// Deduplicate items
function deduplicateItems(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const hash = hashTitle(item.title);
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });
}

// Group by category
function groupByCategory(items: NewsItem[]): Record<string, NewsItem[]> {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NewsItem[]>);
}

// Redis helpers
async function getFromRedis(key: string): Promise<any | null> {
  try {
    const response = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

async function saveToRedis(key: string, value: any, ttl: number): Promise<void> {
  try {
    await fetch(`${REDIS_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: JSON.stringify(value),
        ex: ttl
      })
    });
  } catch (error) {
    console.error('Redis save failed:', error);
  }
}

function jsonResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=300'
    }
  });
}
```

---

## Frontend Implementation

### 1. News Service

Create `services/news.ts`:

```typescript
import type { NewsItem, ThreatClassification } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface DigestResponse {
  categories: Record<string, NewsItem[]>;
  generatedAt: string;
  totalItems: number;
}

// Fetch news digest
export async function fetchNewsDigest(category?: string): Promise<DigestResponse> {
  const url = new URL(`${API_BASE}/news/digest`, window.location.origin);
  if (category) url.searchParams.set('category', category);
  
  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15000)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.status}`);
  }
  
  return response.json();
}

// Fetch with local caching
export async function fetchNewsWithCache(category?: string): Promise<DigestResponse> {
  const cacheKey = `news:digest:${category || 'all'}`;
  
  // Check localStorage cache
  const cached = getCachedNews(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  // Fetch fresh data
  const data = await fetchNewsDigest(category);
  
  // Save to cache
  setCachedNews(cacheKey, data);
  
  return data;
}

// Local cache helpers
function getCachedNews(key: string): { data: DigestResponse; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(`news-cache:${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedNews(key: string, data: DigestResponse): void {
  try {
    localStorage.setItem(`news-cache:${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore storage errors
  }
}
```

### 2. News Component

Create `components/NewsPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { fetchNewsWithCache } from '@/services/news';
import type { NewsItem } from '@/types';

interface NewsPanelProps {
  category?: string;
  maxItems?: number;
}

export function NewsPanel({ category, maxItems = 20 }: NewsPanelProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNews();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [category]);

  async function loadNews() {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchNewsWithCache(category);
      
      // Flatten all categories or use specific one
      const allItems = category 
        ? data.categories[category] || []
        : Object.values(data.categories).flat();
      
      setItems(allItems.slice(0, maxItems));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }

  if (loading && items.length === 0) {
    return <div className="news-loading">Loading news...</div>;
  }

  if (error) {
    return <div className="news-error">Error: {error}</div>;
  }

  return (
    <div className="news-panel">
      <h2>Latest News</h2>
      <div className="news-list">
        {items.map(item => (
          <NewsItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// Individual news item
function NewsItem({ item }: { item: NewsItem }) {
  const timeAgo = formatTimeAgo(item.pubDate);
  const threatClass = `threat-${item.threat.level}`;
  
  return (
    <article className={`news-item ${threatClass}`}>
      <div className="news-header">
        <span className="news-source">{item.source}</span>
        <span className="news-time">{timeAgo}</span>
        {item.isAlert && <span className="news-alert">⚠️ ALERT</span>}
      </div>
      <h3 className="news-title">
        <a href={item.link} target="_blank" rel="noopener noreferrer">
          {item.title}
        </a>
      </h3>
      <div className="news-meta">
        <span className={`threat-badge ${threatClass}`}>
          {item.threat.level.toUpperCase()}
        </span>
        <span className="news-category">{item.category}</span>
      </div>
    </article>
  );
}

// Format relative time
function formatTimeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

### 3. CSS Styles

```css
/* News Panel Styles */
.news-panel {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.news-panel h2 {
  margin-bottom: 20px;
  color: #333;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.news-item {
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
  border-left: 4px solid #dee2e6;
  transition: background 0.2s;
}

.news-item:hover {
  background: #e9ecef;
}

/* Threat level colors */
.news-item.threat-critical {
  border-left-color: #dc3545;
  background: #fff5f5;
}

.news-item.threat-high {
  border-left-color: #fd7e14;
  background: #fff8f0;
}

.news-item.threat-medium {
  border-left-color: #ffc107;
  background: #fffdf5;
}

.news-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #6c757d;
}

.news-source {
  font-weight: 600;
  color: #495057;
}

.news-alert {
  color: #dc3545;
  font-weight: 700;
}

.news-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  line-height: 1.4;
}

.news-title a {
  color: #212529;
  text-decoration: none;
}

.news-title a:hover {
  color: #0d6efd;
  text-decoration: underline;
}

.news-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.threat-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.threat-badge.threat-critical {
  background: #dc3545;
  color: white;
}

.threat-badge.threat-high {
  background: #fd7e14;
  color: white;
}

.threat-badge.threat-medium {
  background: #ffc107;
  color: #000;
}

.threat-badge.threat-low,
.threat-badge.threat-info {
  background: #6c757d;
  color: white;
}

.news-category {
  font-size: 12px;
  color: #6c757d;
  text-transform: capitalize;
}

.news-loading,
.news-error {
  padding: 40px;
  text-align: center;
  color: #6c757d;
}

.news-error {
  color: #dc3545;
}
```

---

## RSS Feed Configuration

### Recommended Feed List

```typescript
export const RSS_FEEDS = [
  // World News
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world' },
  { name: 'Reuters', url: 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en-US', category: 'world' },
  { name: 'AP News', url: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US', category: 'world' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'world' },
  
  // US News
  { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', category: 'us' },
  { name: 'PBS', url: 'https://www.pbs.org/newshour/feeds/rss/headlines', category: 'us' },
  
  // Tech
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'tech' },
  
  // Business
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'business' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', category: 'business' },
];
```

### Google News RSS Format

For sources without direct RSS, use Google News:
```
https://news.google.com/rss/search?q=site:DOMAIN+KEYWORDS&hl=en-US&gl=US&ceid=US:en
```

Examples:
- Reuters World: `site:reuters.com world when:1d`
- AP News: `site:apnews.com when:1d`
- Tech: `(AI OR "artificial intelligence") when:2d`

---

## Threat Classification

### Keyword Dictionary

```typescript
export const THREAT_KEYWORDS = {
  critical: [
    'breaking', 'urgent', 'war declared', 'invasion', 'coup',
    'assassination', 'nuclear launch', 'missile attack',
    'terrorist attack', 'hostage crisis'
  ],
  high: [
    'airstrike', 'bombing', 'missile', 'troops deployed',
    'invasion', 'siege', 'massacre', 'genocide', 'war crime',
    'cyberattack', 'ransomware', 'data breach'
  ],
  medium: [
    'protest', 'demonstration', 'unrest', 'riot', 'curfew',
    'martial law', 'emergency declared', 'conflict',
    'hurricane', 'earthquake', 'flood', 'wildfire'
  ],
  low: [
    'diplomatic', 'negotiations', 'talks', 'summit', 'agreement'
  ]
};

export const CATEGORIES = {
  conflict: ['war', 'invasion', 'airstrike', 'bombing', 'missile', 'troops'],
  protest: ['protest', 'demonstration', 'unrest', 'riot'],
  disaster: ['hurricane', 'earthquake', 'flood', 'wildfire', 'tsunami'],
  economic: ['sanctions', 'embargo', 'trade war', 'currency crisis'],
  cyber: ['cyberattack', 'ransomware', 'data breach', 'hacking'],
  diplomatic: ['summit', 'treaty', 'agreement', 'negotiations']
};
```

---

## Caching Strategy

### Multi-Layer Cache

```
┌─────────────────┐     TTL: 15 minutes
│   Redis Cache   │     Shared across users
│   (Server)      │     
└────────┬────────┘
         │
┌────────▼────────┐     TTL: 5 minutes  
│  Browser Cache  │     Per-user
│ (localStorage)  │     
└────────┬────────┘
         │
┌────────▼────────┐     TTL: 60 seconds
│   Memory Cache  │     Per-session
│    (React)      │     
└─────────────────┘
```

### Cache Implementation

```typescript
// Server-side (Redis)
await redis.setex('news:digest:world', 900, JSON.stringify(data));

// Client-side (localStorage)
localStorage.setItem('news-cache:digest', JSON.stringify({
  data,
  timestamp: Date.now()
}));

// React Query / SWR
const { data } = useSWR('/api/news/digest', fetcher, {
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  dedupingInterval: 60 * 1000     // 1 minute
});
```

---

## Complete Code Example

### Minimal Setup (Single File)

```typescript
// news-aggregator.ts
// Complete working example in a single file

// ===== TYPES =====
interface NewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  pubDate: Date;
  category: string;
  threat: { level: string; category: string; confidence: number };
  isAlert: boolean;
}

// ===== CONFIG =====
const FEEDS = [
  { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world' },
  { name: 'Reuters', url: 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en-US', category: 'world' },
];

const KEYWORDS = {
  critical: ['breaking', 'war', 'invasion', 'nuclear'],
  high: ['airstrike', 'bombing', 'missile', 'attack'],
  medium: ['protest', 'unrest', 'disaster', 'emergency']
};

// ===== CLASSIFIER =====
function classify(title: string) {
  const t = title.toLowerCase();
  for (const [level, words] of Object.entries(KEYWORDS)) {
    if (words.some(w => t.includes(w))) {
      return { level, category: 'general', confidence: 0.8 };
    }
  }
  return { level: 'info', category: 'general', confidence: 0.5 };
}

// ===== PARSER =====
function parseRSS(xml: string, feed: typeof FEEDS[0]): NewsItem[] {
  const items: NewsItem[] = [];
  const matches = xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi);
  
  for (const match of Array.from(matches).slice(0, 5)) {
    const block = match[1];
    const title = block.match(/<title>([^<]*)<\/title>/)?.[1] || '';
    const link = block.match(/<link>([^<]*)<\/link>/)?.[1] || '';
    const pubDate = new Date(block.match(/<pubDate>([^<]*)<\/pubDate>/)?.[1] || '');
    
    if (!title || isNaN(pubDate.getTime())) continue;
    
    const threat = classify(title);
    items.push({
      id: Math.random().toString(36).slice(2),
      source: feed.name,
      title,
      link,
      pubDate,
      category: feed.category,
      threat,
      isAlert: threat.level === 'critical' || threat.level === 'high'
    });
  }
  
  return items;
}

// ===== FETCHER =====
export async function fetchNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async feed => {
      const res = await fetch(feed.url);
      const xml = await res.text();
      return parseRSS(xml, feed);
    })
  );
  
  return results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}
```

---

## Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Create `vercel.json`**:
   ```json
   {
     "functions": {
       "api/news/*.ts": {
         "maxDuration": 30
       }
     }
   }
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Environment Setup

```bash
# Set environment variables
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
```

### Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// middleware.ts or in handler
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60; // seconds

async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `rate_limit:${ip}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, RATE_WINDOW);
  }
  return current <= RATE_LIMIT;
}
```

---

## Monitoring

### Health Check Endpoint

```typescript
// api/news/health.ts
export default async function handler() {
  const checks = await Promise.all([
    checkRedis(),
    checkFeeds()
  ]);
  
  return jsonResponse({
    status: checks.every(c => c.ok) ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  });
}
```

### Log Aggregation

Monitor for these keywords:
- `FEED_HEALTH_WARNING` - Feed parsing issues
- `digest failed` - Digest generation failures
- `all-undated` - Feed returning undated items

---

## License

This implementation is based on the WorldMonitor codebase. Adapt as needed for your application.
