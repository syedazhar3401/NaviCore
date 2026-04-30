import type { Feed, NewsCategory } from '@/types/news';

export const SOURCE_TIERS: Record<string, number> = {
  'Reuters': 1,
  'Associated Press': 1,
  'AP': 1,
  'BBC': 1,
  'AFP': 1,
  'New York Times': 2,
  'Guardian': 2,
  'Financial Times': 2,
  'Wall Street Journal': 2,
  'Washington Post': 2,
  'Al Jazeera': 2,
  'France 24': 2,
  'Deutsche Welle': 2,
  'Defense One': 3,
  'SecurityWeek': 3,
  'OilPrice.com': 3,
  'Energy Central': 3,
  'TechCrunch': 3,
  'The Verge': 3,
};

export const RSS_FEEDS: Feed[] = [
  {
    name: 'Reuters World',
    url: 'https://www.reutersagency.com/feed/?taxonomy=markets&post_type=reuters-best',
    category: 'world',
    lang: 'en',
    tier: 1,
    region: 'global'
  },
  {
    name: 'BBC World',
    url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'world',
    lang: 'en',
    tier: 1,
    region: 'global'
  },
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    category: 'world',
    lang: 'en',
    tier: 2,
    region: 'middle-east'
  },
  {
    name: 'France 24',
    url: 'https://www.france24.com/en/rss',
    category: 'world',
    lang: 'en',
    tier: 2,
    region: 'europe'
  },
  {
    name: 'Reuters Business',
    url: 'https://www.reutersagency.com/feed/?taxonomy=markets&post_type=reuters-best',
    category: 'business',
    lang: 'en',
    tier: 1
  },
  {
    name: 'Financial Times',
    url: 'https://www.ft.com/rss/home',
    category: 'business',
    lang: 'en',
    tier: 2
  },
  {
    name: 'Bloomberg Markets',
    url: 'https://feeds.bloomberg.com/markets/news.rss',
    category: 'business',
    lang: 'en',
    tier: 2
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'tech',
    lang: 'en',
    tier: 3
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'tech',
    lang: 'en',
    tier: 3
  },
  {
    name: 'Defense One',
    url: 'https://www.defenseone.com/rss/all.xml',
    category: 'security',
    lang: 'en',
    tier: 3,
    region: 'defense'
  },
  {
    name: 'SecurityWeek',
    url: 'https://feeds.feedburner.com/securityweek',
    category: 'security',
    lang: 'en',
    tier: 3,
    region: 'cyber'
  },
  {
    name: 'OilPrice.com',
    url: 'https://oilprice.com/rss/main',
    category: 'energy',
    lang: 'en',
    tier: 3
  },
  {
    name: 'Energy Central',
    url: 'https://feeds.feedburner.com/EnergyCentral',
    category: 'energy',
    lang: 'en',
    tier: 3
  },
];

export function getSourceTier(sourceName: string): number {
  if (SOURCE_TIERS[sourceName]) return SOURCE_TIERS[sourceName];
  for (const [name, tier] of Object.entries(SOURCE_TIERS)) {
    if (sourceName.toLowerCase().includes(name.toLowerCase())) {
      return tier;
    }
  }
  return 4;
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  { id: 'world', name: 'World News', icon: '🌍', feeds: RSS_FEEDS.filter(f => f.category === 'world') },
  { id: 'business', name: 'Business & Finance', icon: '💼', feeds: RSS_FEEDS.filter(f => f.category === 'business') },
  { id: 'tech', name: 'Technology', icon: '💻', feeds: RSS_FEEDS.filter(f => f.category === 'tech') },
  { id: 'security', name: 'Security & Defense', icon: '🛡️', feeds: RSS_FEEDS.filter(f => f.category === 'security') },
  { id: 'energy', name: 'Energy & Resources', icon: '⛽', feeds: RSS_FEEDS.filter(f => f.category === 'energy') },
];
