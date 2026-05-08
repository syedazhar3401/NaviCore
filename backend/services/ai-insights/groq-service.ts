import type { ProgressCallback, SummarizationResult, SummarizeOptions } from './types.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getGroqApiKey(): string {
  return process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
}

function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}


const GROQ_MODELS = {
  fast: 'llama-3.1-8b-instant',
  balanced: 'llama-3.3-70b-versatile',
  powerful: 'openai/gpt-oss-120b',
};

const summaryCache = new Map<string, { result: SummarizationResult; expires: number }>();
const CACHE_TTL = 2 * 60 * 60 * 1000;

export async function generateSummary(
  headlines: string[],
  onProgress?: ProgressCallback,
  geoContext?: string,
  lang: string = 'en',
  options?: SummarizeOptions,
): Promise<SummarizationResult> {
  const usableHeadlines = headlines.filter(Boolean).slice(0, 10);
  if (usableHeadlines.length === 0) {
    return deterministicSummary([], geoContext);
  }

  const cacheKey = buildSummaryCacheKey(usableHeadlines, lang, geoContext);
  const cached = getCachedSummary(cacheKey);
  if (cached) return cached;

  const groqApiKey = getGroqApiKey();
  if (!options?.skipCloudProviders && groqApiKey) {
    onProgress?.(1, 3, 'Connecting to Groq AI...');
    const groqResult = await tryGroq(usableHeadlines, groqApiKey, geoContext, lang, options?.bodies);
    if (groqResult) {
      setCachedSummary(cacheKey, groqResult);
      return groqResult;
    }
  }

  const openRouterApiKey = getOpenRouterApiKey();
  if (!options?.skipCloudProviders && openRouterApiKey) {
    onProgress?.(2, 3, 'Trying OpenRouter...');
    const openRouterResult = await tryOpenRouter(usableHeadlines, openRouterApiKey, geoContext, lang, options?.bodies);
    if (openRouterResult) {
      setCachedSummary(cacheKey, openRouterResult);
      return openRouterResult;
    }
  }

  onProgress?.(3, 3, 'Using deterministic fallback...');
  const fallback = deterministicSummary(usableHeadlines, geoContext);
  setCachedSummary(cacheKey, fallback);
  return fallback;
}

async function tryGroq(headlines: string[], groqApiKey: string, geoContext?: string, lang?: string, bodies?: string[]): Promise<SummarizationResult | null> {
  try {
    const prompt = buildPrompt(headlines, geoContext, lang, bodies);
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODELS.balanced,
        messages: [
          {
            role: 'system',
            content: 'You are a maritime and geopolitical intelligence analyst. Summarize news headlines into 2-3 concise, actionable sentences. Focus on operational risk, regional instability, military/security developments, and economic impacts. Be objective and factual.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 220,
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary || summary.length < 20) return null;

    return { summary, provider: 'groq', model: data.model || GROQ_MODELS.balanced, cached: false };
  } catch (error) {
    console.warn('[AI Insights] Groq failed:', error);
    return null;
  }
}

async function tryOpenRouter(headlines: string[], openRouterApiKey: string, geoContext?: string, lang?: string, bodies?: string[]): Promise<SummarizationResult | null> {
  try {
    const prompt = buildPrompt(headlines, geoContext, lang, bodies);
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: 'You are a geopolitical intelligence analyst. Summarize news into 2-3 concise sentences.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 220,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary || summary.length < 20) return null;

    return { summary, provider: 'openrouter', model: data.model || 'anthropic/claude-3-haiku', cached: false };
  } catch (error) {
    console.warn('[AI Insights] OpenRouter failed:', error);
    return null;
  }
}

function deterministicSummary(headlines: string[], geoContext?: string): SummarizationResult {
  const top = headlines.slice(0, 3);

  const summary = top.length > 0
    ? [
        `Primary live development: ${top[0]}.`,
        top[1] ? `Secondary watch item: ${top[1]}.` : null,
        top[2] ? `Additional signal: ${top[2]}.` : null,
        geoContext
          ? 'Operational note: focal-point synthesis indicates correlated regional pressure that should be monitored closely.'
          : 'Operational note: maintain standard routing caution and continue monitoring live advisories.',
      ].filter(Boolean).join(' ')
    : 'No high-confidence live headlines are available right now; maintain standard operating watch and refresh the feed shortly.';

  return { summary, provider: 'deterministic', model: 'rules-fallback', cached: false };
}

function buildPrompt(headlines: string[], geoContext?: string, lang?: string, bodies?: string[]): string {
  const lines: string[] = [];
  lines.push('Analyze these live news headlines and provide a concise intelligence brief for a maritime operations dashboard:');
  lines.push('');

  headlines.slice(0, 8).forEach((headline, i) => {
    lines.push(`${i + 1}. ${headline}`);
    if (bodies?.[i]) lines.push(`   Context: ${bodies[i].slice(0, 180)}...`);
  });

  if (geoContext) {
    lines.push('', 'INTELLIGENCE CONTEXT:', geoContext);
  }

  lines.push('', 'Return 2-3 sentences covering key developments, operational/maritime risk, and regions to monitor.');
  if (lang && lang !== 'en') lines.push(`Respond in language code: ${lang}`);
  return lines.join('\n');
}

export function getCachedSummary(cacheKey: string): SummarizationResult | null {
  const cached = summaryCache.get(cacheKey);
  if (!cached || cached.expires <= Date.now()) {
    summaryCache.delete(cacheKey);
    return null;
  }
  return { ...cached.result, provider: 'cache', cached: true };
}

export function setCachedSummary(cacheKey: string, result: SummarizationResult): void {
  summaryCache.set(cacheKey, { result, expires: Date.now() + CACHE_TTL });
}

export function buildSummaryCacheKey(headlines: string[], mode: string, geoContext?: string): string {
  return hashString(JSON.stringify({ headlines: headlines.slice(0, 5), mode, geoContext }));
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
