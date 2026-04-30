import type { NewsItem } from '@/types/news';
import type { AIInsightsResponse } from '@/types/ai-insights';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4000`;
const REQUEST_TIMEOUT_MS = 60000;

export async function analyzeNewsInsights(items: NewsItem[]): Promise<AIInsightsResponse> {
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
