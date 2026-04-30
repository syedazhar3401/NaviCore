import type { BackendNewsItem, ClusteredEvent, NewsItem, ThreatClassification } from './types.js';

export function clusterNewsItems(items: BackendNewsItem[]): ClusteredEvent[] {
  const validItems = items.filter(item => item?.title && item?.link).slice(0, 100);
  const groups = new Map<string, BackendNewsItem[]>();

  for (const item of validItems) {
    const key = normalizeTitle(item.title).slice(0, 80) || item.id || item.title;
    groups.set(key, [...(groups.get(key) || []), item]);
  }

  return [...groups.entries()].flatMap(([key, group]) => {
    const sortedGroup = [...group].sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0));
    const primary = sortedGroup[0];
    if (!primary) return [];

    const dates = sortedGroup.map(item => safeDate(item.pubDate).getTime());
    const level = primary.threat?.level && primary.threat.level !== 'info' ? primary.threat.level : 'low';

    return [{
      id: `cluster-${hashString(key)}`,
      primaryTitle: primary.title,
      primaryLink: primary.link,
      allItems: sortedGroup.map(toInsightNewsItem),
      sourceCount: new Set(sortedGroup.map(item => item.source)).size,
      uniqueSources: [...new Set(sortedGroup.map(item => item.source))],
      earliestPubDate: new Date(Math.min(...dates)),
      latestPubDate: new Date(Math.max(...dates)),
      threatClassification: {
        level: level as ThreatClassification['level'],
        confidence: primary.threat?.confidence || 0.5,
        keywords: primary.tags || [],
        reasoning: primary.threat?.category || 'Derived from live news classification',
      },
      importanceScore: Math.max(...sortedGroup.map(item => item.importanceScore || 0)),
    }];
  }).sort((a, b) => b.importanceScore - a.importanceScore);
}

function toInsightNewsItem(item: BackendNewsItem): NewsItem {
  const tier = item.tier || 3;
  const insightItem: NewsItem = {
    id: item.id,
    title: item.title,
    link: item.link,
    description: item.snippet || item.description || '',
    pubDate: safeDate(item.pubDate),
    source: item.source,
    sourceTier: tier <= 1 ? 'tier1' : tier === 2 ? 'tier2' : 'tier3',
    categories: item.tags || [item.region || 'world'].filter(Boolean) as string[],
    tier,
  };

  if (item.threat) insightItem.threat = item.threat;
  if (item.locationName) insightItem.locationName = item.locationName;
  if (item.region) insightItem.region = item.region;

  return insightItem;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|and|or|to|of|in|on|for|with|as|by|from|after|before)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeDate(value: string | Date | undefined): Date {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
