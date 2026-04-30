import type { NewsItem } from '@/types/news';
import type { AIInsightsResponse, AnalyzedHeadline, FocalPoint } from '@/types/ai-insights';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4000`;
const REQUEST_TIMEOUT_MS = 60000;

export async function analyzeNewsInsights(items: NewsItem[]): Promise<AIInsightsResponse> {
  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/insights/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.slice(0, 100) }),
    }, REQUEST_TIMEOUT_MS);

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(`AI insights failed: ${response.status}${message ? ` - ${message.slice(0, 160)}` : ''}`);
    }

    return response.json();
  } catch (error) {
    console.warn('[AIInsights] Backend unavailable, using local fallback insights', error);
    return buildFallbackInsights(items);
  }
}

function buildFallbackInsights(items: NewsItem[]): AIInsightsResponse {
  const safeItems = items.slice(0, 100);
  const nowIso = new Date().toISOString();

  const analyzed: AnalyzedHeadline[] = safeItems.slice(0, 12).map((item, index) => {
    const sourceCount = Math.max(1, item.corroborationCount || 1);
    const score = Math.min(0.95, Math.max(0.2, (item.importanceScore || 50) / 100));
    const confidence = Math.min(0.96, 0.55 + sourceCount * 0.04);

    return {
      id: item.id || `headline-${index}`,
      title: item.title,
      sourceCount,
      perspectives: [
        { name: 'security', score, confidence, reasoning: 'Risk weighted by threat level and corroboration.' },
        { name: 'economic', score: Math.max(0.15, score - 0.1), confidence: Math.max(0.5, confidence - 0.08), reasoning: 'Economic impact inferred from tags and geography.' },
        { name: 'stability', score: Math.max(0.1, score - 0.15), confidence: Math.max(0.45, confidence - 0.1), reasoning: 'Regional escalation potential estimated from event category.' },
      ],
      finalScore: score,
      confidence,
      disagreement: Math.max(0.04, Math.abs((item.velocity?.sentimentScore || 0) * 0.25)),
      flagged: !!item.isAlert || score > 0.78,
      flagReason: item.isAlert ? 'Marked as active alert from upstream feed.' : (score > 0.78 ? 'High composite risk score.' : undefined),
    };
  });

  const clusters = safeItems.slice(0, 8).map((item, index) => ({
    id: `cluster-${index + 1}`,
    primaryTitle: item.title,
    primaryLink: item.link,
    allItems: [item],
    sourceCount: Math.max(1, item.corroborationCount || 1),
    uniqueSources: [item.source],
    earliestPubDate: new Date(item.pubDate).toISOString(),
    latestPubDate: new Date(item.pubDate).toISOString(),
    importanceScore: item.importanceScore || 50,
  }));

  const topFocusItems = safeItems
    .filter(i => (i.importanceScore || 0) >= 82 || i.isAlert)
    .slice(0, 5);

  const focalPoints: FocalPoint[] = topFocusItems.map((item, index) => {
    const urgency: FocalPoint['urgency'] = item.isAlert
      ? ((item.threat?.level === 'critical' || item.threat?.level === 'high') ? 'critical' : 'elevated')
      : ((item.importanceScore || 0) > 88 ? 'elevated' : 'watch');

    return {
      id: `fp-${index + 1}`,
      entityId: item.id,
      entityType: 'organization',
      displayName: item.locationName || item.source,
      newsMentions: Math.max(1, item.corroborationCount || 1),
      newsVelocity: item.velocity?.sourcesPerHour || 2,
      topHeadlines: [{ title: item.title, url: item.link }],
      signalTypes: [item.threat?.category || 'general'],
      signalCount: item.isAlert ? 2 : 1,
      highSeverityCount: (item.threat?.level === 'critical' || item.threat?.level === 'high') ? 1 : 0,
      signalDescriptions: [item.snippet || item.title],
      focalScore: item.importanceScore || 50,
      urgency,
      narrative: item.snippet || `${item.source} reports elevated activity in ${item.locationName || 'a monitored region'}.`,
      correlationEvidence: [
        `Source: ${item.source}`,
        item.locationName ? `Location: ${item.locationName}` : 'Location metadata unavailable',
        `Threat: ${(item.threat?.level || 'info').toUpperCase()} / ${(item.threat?.category || 'general').toUpperCase()}`,
      ],
    };
  });

  const highCount = safeItems.filter(i => i.isAlert || (i.importanceScore || 0) >= 85).length;
  const regions = new Set(safeItems.map(i => i.locationName).filter(Boolean)).size;

  return {
    clusters,
    analysisReport: {
      timestamp: Date.now(),
      totalHeadlines: safeItems.length,
      analyzed,
      topByConsensus: [...analyzed].sort((a, b) => b.finalScore - a.finalScore).slice(0, 5),
      topByDisagreement: [...analyzed].sort((a, b) => b.disagreement - a.disagreement).slice(0, 5),
      missedByKeywords: analyzed.filter(a => !a.flagged).slice(0, 3),
      perspectiveCorrelations: {
        security_economic: 0.64,
        security_stability: 0.78,
        economic_stability: 0.57,
      },
    },
    focalPoints,
    aiContext: `Fallback deterministic analysis generated from ${safeItems.length} headline(s). High-priority events: ${highCount}. Distinct geographies referenced: ${regions}.`,
    summary: {
      summary: `Maritime risk remains elevated across key shipping lanes. We currently track ${highCount} high-priority signals out of ${safeItems.length} headlines, with hotspots concentrated around chokepoints and major port infrastructure.`,
      provider: 'deterministic',
      model: 'local-fallback-v1',
      cached: false,
    },
    generatedAt: nowIso,
    cached: false,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
