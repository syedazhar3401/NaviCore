/**
 * Groq API Integration Service
 * Handles AI summarization with fallback chain
 */

export type SummarizationProvider = 'groq' | 'openrouter' | 'browser' | 'cache';

export interface SummarizationResult {
  summary: string;
  provider: SummarizationProvider;
  model: string;
  cached: boolean;
}

export interface SummarizeOptions {
  skipCloudProviders?: boolean;
  skipBrowserFallback?: boolean;
  bodies?: string[];  // Article bodies for context
}

export type ProgressCallback = (step: number, total: number, message: string) => void;

// Groq API Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Available models
const GROQ_MODELS = {
  fast: 'llama3-8b-8192',      // Fast, cheaper
  balanced: 'llama3-70b-8192', // Best balance
  powerful: 'mixtral-8x7b-32768', // Most capable
};

/**
 * Generate AI summary using Groq API
 * Fallback chain: Groq -> OpenRouter -> Browser T5
 */
export async function generateSummary(
  headlines: string[],
  onProgress?: ProgressCallback,
  geoContext?: string,
  lang: string = 'en',
  options?: SummarizeOptions,
): Promise<SummarizationResult | null> {
  if (!headlines || headlines.length < 2) {
    return null;
  }

  // Try Groq first
  if (!options?.skipCloudProviders && GROQ_API_KEY) {
    onProgress?.(1, 3, 'Connecting to Groq AI...');
    const groqResult = await tryGroq(headlines, geoContext, lang, options?.bodies);
    if (groqResult) return groqResult;
  }

  // Fallback to OpenRouter
  if (!options?.skipCloudProviders) {
    onProgress?.(2, 3, 'Trying OpenRouter...');
    const openRouterResult = await tryOpenRouter(headlines, geoContext, lang);
    if (openRouterResult) return openRouterResult;
  }

  // Final fallback: Browser T5
  if (!options?.skipBrowserFallback) {
    onProgress?.(3, 3, 'Using local AI model...');
    const browserResult = await tryBrowserT5(headlines, options?.bodies);
    if (browserResult) return browserResult;
  }

  onProgress?.(3, 3, 'No providers available');
  return null;
}

/**
 * Try Groq API for summarization
 */
async function tryGroq(
  headlines: string[],
  geoContext?: string,
  lang?: string,
  bodies?: string[],
): Promise<SummarizationResult | null> {
  try {
    const prompt = buildPrompt(headlines, geoContext, lang, bodies);
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODELS.balanced,
        messages: [
          {
            role: 'system',
            content: `You are a geopolitical intelligence analyst. Summarize news headlines into 2-3 concise, actionable sentences. Focus on geopolitical significance, military developments, and economic impacts. Be objective and factual.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary || summary.length < 20) {
      return null;
    }

    return {
      summary,
      provider: 'groq',
      model: data.model || GROQ_MODELS.balanced,
      cached: false,
    };
  } catch (error) {
    console.warn('[Groq] Failed:', error);
    return null;
  }
}

/**
 * Try OpenRouter as fallback
 */
async function tryOpenRouter(
  headlines: string[],
  geoContext?: string,
  lang?: string,
): Promise<SummarizationResult | null> {
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_KEY) return null;

  try {
    const prompt = buildPrompt(headlines, geoContext, lang);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'system',
            content: 'You are a geopolitical intelligence analyst. Summarize news into 2-3 concise sentences.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary || summary.length < 20) return null;

    return {
      summary,
      provider: 'openrouter',
      model: data.model || 'claude-3-haiku',
      cached: false,
    };
  } catch {
    return null;
  }
}

/**
 * Browser T5 fallback using Transformers.js
 */
async function tryBrowserT5(
  headlines: string[],
  bodies?: string[],
): Promise<SummarizationResult | null> {
  try {
    // Check if Transformers.js is available
    const hasTransformers = typeof window !== 'undefined' && 
      (window as any).transformers !== undefined;
    
    if (!hasTransformers) {
      return null;
    }

    const topHeadlines = headlines.slice(0, 5);
    const hasBody = Array.isArray(bodies) && bodies.some(b => typeof b === 'string' && b.length > 0);
    
    const combinedText = hasBody
      ? topHeadlines.map((h, i) => {
          const b = typeof bodies![i] === 'string' ? bodies![i]!.slice(0, 200) : '';
          return b ? `${h.slice(0, 80)} — ${b}` : h.slice(0, 80);
        }).join('. ')
      : topHeadlines.map(h => h.slice(0, 80)).join('. ');

    const prompt = `Summarize the most important headline in 2 concise sentences (under 60 words): ${combinedText}`;

    // Use Transformers.js pipeline
    const transformers = (window as any).transformers;
    const summarizer = await transformers.pipeline('summarization', 'Xenova/t5-small');
    const result = await summarizer(prompt, { max_length: 100 });

    const summary = result?.[0]?.summary_text;
    
    if (!summary || summary.length < 20) {
      return null;
    }

    return {
      summary,
      provider: 'browser',
      model: 't5-small',
      cached: false,
    };
  } catch (error) {
    console.warn('[Browser T5] Failed:', error);
    return null;
  }
}

/**
 * Build the prompt for LLM
 */
function buildPrompt(
  headlines: string[],
  geoContext?: string,
  lang?: string,
  bodies?: string[],
): string {
  const lines: string[] = [];
  
  lines.push('Analyze these news headlines and provide a geopolitical summary:');
  lines.push('');
  
  // Add top headlines
  const topHeadlines = headlines.slice(0, 8);
  const hasBodies = Array.isArray(bodies) && bodies.length > 0;
  
  topHeadlines.forEach((headline, i) => {
    if (hasBodies && bodies![i]) {
      lines.push(`${i + 1}. ${headline}`);
      lines.push(`   Context: ${bodies![i].slice(0, 150)}...`);
    } else {
      lines.push(`${i + 1}. ${headline}`);
    }
  });
  
  // Add intelligence context if available
  if (geoContext) {
    lines.push('');
    lines.push('INTELLIGENCE CONTEXT:');
    lines.push(geoContext);
  }
  
  lines.push('');
  lines.push('Provide a 2-3 sentence summary focusing on:');
  lines.push('- Key geopolitical developments');
  lines.push('- Military/security implications');
  lines.push('- Regional impact');
  
  return lines.join('\n');
}

/**
 * Simple cache implementation
 */
const summaryCache = new Map<string, SummarizationResult>();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

export function getCachedSummary(cacheKey: string): SummarizationResult | null {
  const cached = summaryCache.get(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }
  return null;
}

export function setCachedSummary(cacheKey: string, result: SummarizationResult): void {
  summaryCache.set(cacheKey, result);
  
  // Clean old entries
  setTimeout(() => {
    summaryCache.delete(cacheKey);
  }, CACHE_TTL);
}

/**
 * Build cache key from headlines
 */
export function buildSummaryCacheKey(
  headlines: string[],
  mode: string,
  geoContext?: string,
): string {
  const data = JSON.stringify({ headlines: headlines.slice(0, 5), mode, geoContext });
  return hashString(data);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
