# AI Insights Implementation

Complete AI-powered intelligence analysis system extracted from WorldMonitor.

## Files Overview

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript type definitions |
| `parallel-analysis.ts` | 6-perspective news analysis engine |
| `focal-point-detector.ts` | Correlates news with map signals |
| `groq-service.ts` | AI summarization with fallback chain |
| `AIInsightsPanel.tsx` | React component for displaying insights |
| `README.md` | This file |

## Quick Start

### 1. Install Dependencies

```bash
npm install rss-parser
# For browser T5 fallback (optional):
npm install @xenova/transformers
```

### 2. Set Up Environment Variables

```bash
# .env.local
GROQ_API_KEY=your_groq_api_key_here
# Optional fallback:
OPENROUTER_API_KEY=your_openrouter_key_here
```

Get your Groq API key at: https://console.groq.com

### 3. Copy Files to Your Project

```
src/
  services/
    ai-insights/
      types.ts
      parallel-analysis.ts
      focal-point-detector.ts
      groq-service.ts
  components/
    AIInsightsPanel.tsx
```

### 4. Basic Usage

```typescript
import { AIInsightsPanel } from './components/AIInsightsPanel';
import type { ClusteredEvent } from './services/ai-insights/types';

// In your component:
const clusters: ClusteredEvent[] = [...]; // From news aggregation

<AIInsightsPanel 
  clusters={clusters}
  signalSummary={mapSignals} // Optional: correlate with map data
/>
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI INSIGHTS PIPELINE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUT: Clustered News Stories                              │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     PARALLEL ANALYSIS (6 Perspectives)              │   │
│  │  • Keywords (0.25)  • Sentiment (0.15)              │   │
│  │  • Entities (0.20)  • Novelty (0.10)                │   │
│  │  • Velocity (0.15)  • Sources (0.15)                │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     FOCAL POINT DETECTION                           │   │
│  │  Correlate news entities with map signals           │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     GROQ API SUMMARIZATION                          │   │
│  │  Fallback: Groq → OpenRouter → Browser T5          │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  OUTPUT: AI Brief + Focal Points + Scored Stories          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Parallel Analysis (6 Perspectives)

Each news story is scored from 6 angles:

| Perspective | Weight | Description |
|-------------|--------|-------------|
| Keywords | 0.25 | Violence, military, unrest, flashpoint detection |
| Entities | 0.20 | Countries, leaders, organizations mentioned |
| Sources | 0.15 | Cross-verification count |
| Velocity | 0.15 | Publication frequency (breaking vs sustained) |
| Sentiment | 0.15 | Emotional tone analysis |
| Novelty | 0.10 | Semantic uniqueness vs repetition |

### 2. Focal Point Detection

Identifies "main characters" in the news:
- **Iran** mentioned in 12 stories + military flights detected = CRITICAL
- **Ukraine** mentioned in 8 stories + sanctions pressure = ELEVATED

Urgency levels: `watch` | `elevated` | `critical`

### 3. AI Summarization

Generates human-readable briefs using:
- **Primary**: Groq API (llama3-70b-8192)
- **Fallback 1**: OpenRouter (Claude 3 Haiku)
- **Fallback 2**: Browser T5 (local, no API needed)

## Configuration

### Keyword Dictionaries

Edit `parallel-analysis.ts` to customize:

```typescript
const KEYWORD_DICTIONARIES = {
  VIOLENCE: ['killed', 'attack', 'war', ...],
  MILITARY: ['troops', 'missile', 'invasion', ...],
  UNREST: ['protest', 'riot', 'coup', ...],
  FLASHPOINTS: ['iran', 'russia', 'china', ...],
  BUSINESS_DEMOTE: ['earnings', 'stock', 'ipo', ...], // Reduces score
};
```

### Perspective Weights

Adjust importance of each perspective:

```typescript
const PERSPECTIVE_WEIGHTS = {
  keywords: 0.25,   // Increase for more keyword-heavy scoring
  entities: 0.20,
  sources: 0.15,
  velocity: 0.15,
  sentiment: 0.15,
  novelty: 0.10,
};
```

## API Reference

### Parallel Analysis

```typescript
import { parallelAnalysis } from './parallel-analysis';

const report = await parallelAnalysis.analyzeClusters(clusters);

// Report contains:
report.analyzed;           // All scored stories
report.topByConsensus;     // High confidence stories
report.topByDisagreement;  // Controversial/unclear stories
report.missedByKeywords;   // ML caught, keywords missed
```

### Focal Point Detector

```typescript
import { focalPointDetector } from './focal-point-detector';

const { focalPoints, aiContext } = focalPointDetector.analyze(
  clusters,
  signalSummary
);

// focalPoints[] contains:
// - displayName: "Iran"
// - focalScore: 85 (0-100)
// - urgency: "critical"
// - newsMentions: 12
// - signalCount: 5
// - narrative: "12 news mentions | 3 military flights | ..."
```

### Groq Service

```typescript
import { generateSummary } from './groq-service';

const result = await generateSummary(
  headlines,           // string[]
  onProgress,          // (step, total, message) => void
  geoContext,          // Optional intelligence context
  'en',                // Language
  { bodies }           // Optional article bodies
);

// Result:
// {
//   summary: "Iran faces escalating pressure...",
//   provider: "groq",
//   model: "llama3-70b-8192",
//   cached: false
// }
```

## Styling

The `AIInsightsPanel` component uses CSS classes. Add these styles:

```css
.ai-insights-panel {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px;
  color: #fff;
}

.ai-insights-panel .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.ai-insights-panel .tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.ai-insights-panel .tabs button {
  padding: 8px 16px;
  border: none;
  background: #2d2d44;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
}

.ai-insights-panel .tabs button.active {
  background: #4a9eff;
}

.focal-point-card {
  background: #252538;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid;
}

.focal-point-card.critical {
  border-left-color: #ff4757;
}

.focal-point-card.elevated {
  border-left-color: #ff9f43;
}

.focal-point-card.watch {
  border-left-color: #4a9eff;
}
```

## Cost Optimization

Groq API pricing (as of 2024):
- **llama3-8b-8192**: $0.05/1M tokens (fast, cheap)
- **llama3-70b-8192**: $0.59/1M tokens (balanced) ← Recommended
- **mixtral-8x7b-32768**: $0.27/1M tokens (powerful)

Each summary request uses ~500-1000 tokens.

### Caching

The service automatically caches results for 2 hours:

```typescript
import { getCachedSummary, setCachedSummary } from './groq-service';

// Check cache first
const cached = getCachedSummary(cacheKey);
if (cached) return cached;

// Store result
setCachedSummary(cacheKey, result);
```

## Troubleshooting

### "No providers available"
- Check your `GROQ_API_KEY` is set correctly
- Verify the API key is valid at console.groq.com
- Check network connectivity

### High API costs
- Enable caching (enabled by default)
- Reduce update frequency (default: every 5 minutes)
- Use `skipCloudProviders: true` to use browser T5 only

### Low-quality summaries
- Provide `bodies` (article descriptions) for more context
- Include `geoContext` from focal point detection
- Adjust the system prompt in `groq-service.ts`

## License

Extracted from WorldMonitor for educational purposes.
