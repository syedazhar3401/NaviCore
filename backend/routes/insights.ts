import express from 'express';
import type { BackendNewsItem, AIInsightResponse } from '../services/ai-insights/types.js';
import type { SignalSummary } from '../services/ai-insights/focal-point-detector.js';
import { clusterNewsItems, hashString } from '../services/ai-insights/news-clustering.js';
import { parallelAnalysis } from '../services/ai-insights/parallel-analysis.js';
import { focalPointDetector } from '../services/ai-insights/focal-point-detector.js';
import { generateSummary } from '../services/ai-insights/groq-service.js';

const router = express.Router();
const CACHE_TTL = 30 * 60 * 1000;
const insightCache = new Map<string, { data: AIInsightResponse; expires: number }>();

router.post('/insights/analyze', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items as BackendNewsItem[] : [];
    const signalSummary = req.body?.signalSummary as SignalSummary | undefined;

    if (items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const cacheKey = buildInsightCacheKey(items);
    const cached = insightCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.json({ ...cached.data, cached: true });
    }
    insightCache.delete(cacheKey);

    const clusters = clusterNewsItems(items);
    const analysisReport = await parallelAnalysis.analyzeClusters(clusters);
    const { focalPoints, aiContext } = focalPointDetector.analyze(
      clusters,
      normalizeSignalSummary(signalSummary),
    );

    const topStories = analysisReport.topByConsensus.length > 0
      ? analysisReport.topByConsensus
      : analysisReport.analyzed;
    const headlines = topStories.slice(0, 8).map(story => story.title);
    const bodies = clusters.slice(0, 8).map(cluster => cluster.allItems[0]?.description || '');
    const summary = await generateSummary(headlines, undefined, aiContext, 'en', { bodies });

    const response: AIInsightResponse = {
      clusters,
      analysisReport,
      focalPoints,
      aiContext,
      summary,
      generatedAt: new Date().toISOString(),
    };

    insightCache.set(cacheKey, { data: response, expires: Date.now() + CACHE_TTL });
    res.json(response);
  } catch (error) {
    console.error('[AI Insights] Analyze error:', error);
    res.status(500).json({ error: 'Failed to generate AI insights', message: String(error) });
  }
});

router.get('/insights/health', (_req, res) => {
  const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

  res.json({
    status: 'ok',
    groqConfigured: Boolean(groqKey),
    groqKeySource: process.env.GROQ_API_KEY ? 'GROQ_API_KEY' : process.env.VITE_GROQ_API_KEY ? 'VITE_GROQ_API_KEY' : null,
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    cacheEntries: insightCache.size,
    timestamp: new Date().toISOString(),
  });
});

function normalizeSignalSummary(signalSummary?: SignalSummary): SignalSummary {
  if (!signalSummary?.topCountries) return { topCountries: [] };
  return {
    topCountries: signalSummary.topCountries.map(country => ({
      ...country,
      signalTypes: Array.isArray(country.signalTypes) ? country.signalTypes : Array.from(country.signalTypes || []),
      signals: Array.isArray(country.signals) ? country.signals : [],
      totalCount: country.totalCount || 0,
      highSeverityCount: country.highSeverityCount || 0,
    })),
  };
}

function buildInsightCacheKey(items: BackendNewsItem[]): string {
  const keyItems = items
    .slice(0, 30)
    .map(item => `${item.id || item.title}:${item.pubDate}`)
    .join('|');
  return `insights:${hashString(keyItems)}`;
}

export default router;
