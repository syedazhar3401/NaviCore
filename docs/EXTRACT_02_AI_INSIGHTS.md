# PART 2: AI Insights System - Deep Dive Extraction

> **Key Feature Extracted from WorldMonitor**
> AI-powered analysis using Groq API with multi-perspective scoring, focal point detection, and intelligent summarization.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [AI System Flow](#ai-system-flow)
3. [Parallel Analysis Engine](#parallel-analysis-engine)
4. [Focal Point Detection](#focal-point-detection)
5. [Groq API Integration](#groq-api-integration)
6. [Summarization Pipeline](#summarization-pipeline)
7. [Complete Implementation](#complete-implementation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI INSIGHTS PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT: Clustered News Stories                                              │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────┐                   │
│  │     PARALLEL ANALYSIS (6 Perspectives)              │                   │
│  │                                                     │                   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐           │                   │
│  │  │Keywords │  │Sentiment │  │Entities  │           │                   │
│  │  │(0.25)   │  │(0.15)    │  │(0.20)    │           │                   │
│  │  └─────────┘  └──────────┘  └──────────┘           │                   │
│  │                                                     │                   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐           │                   │
│  │  │Novelty  │  │ Velocity │  │ Sources  │           │                   │
│  │  │(0.10)   │  │(0.15)    │  │(0.15)    │           │                   │
│  │  └─────────┘  └──────────┘  └──────────┘           │                   │
│  │                                                     │                   │
│  └─────────────────────────────────────────────────────┘                   │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────┐                   │
│  │     FOCAL POINT DETECTION                           │                   │
│  │                                                     │                   │
│  │  Correlate news entities with map signals:          │                   │
│  │  • Iran mentioned in 12 news stories              │                   │
│  │  • + 5 military flights detected                  │                   │
│  │  • + Internet outage reported                     │                   │
│  │  = CRITICAL focal point                           │                   │
│  │                                                     │                   │
│  └─────────────────────────────────────────────────────┘                   │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────┐                   │
│  │     GROQ API SUMMARIZATION                          │                   │
│  │                                                     │                   │
│  │  Input: Top headlines + Focal points context        │                   │
│  │                                                     │                   │
│  │  System: "You are a geopolitical intelligence      │                   │
│  │           analyst. Summarize into actionable       │                   │
│  │           insights."                                │                   │
│  │                                                     │                   │
│  │  Model: llama3-70b-8192 (or mixtral-8x7b)          │                   │
│  │                                                     │                   │
│  │  Fallback: OpenRouter → Browser T5                │                   │
│  └─────────────────────────────────────────────────────┘                   │
│       │                                                                     │
│       ▼                                                                     │
│  OUTPUT: AI Brief + Focal Points + Scored Stories                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AI System Flow

### Complete Data Flow

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Raw News   │────▶│  Parallel Analysis │────▶│ Scored Stories  │
│    Items     │     │  (6 Perspectives)  │     │ (0-100 score)   │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                              ┌────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │ Entity Extraction │
                    │ (NER + Geocoding) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌─────────────┐ ┌──────────────┐ ┌─────────────┐
     │   News      │ │    Map       │ │  Focal      │
     │  Mentions   │ │   Signals    │ │  Points     │
     └─────────────┘ └──────────────┘ └──────┬──────┘
                                             │
                                             ▼
                              ┌──────────────────────────┐
                              │  Context Builder         │
                              │  [INTELLIGENCE SYNTHESIS]│
                              │                          │
                              │  CRITICAL: Iran (8 news) │
                              │  + military flights      │
                              │  + sanctions detected    │
                              └───────────┬──────────────┘
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │  Groq API                │
                              │  llama3-70b-8192         │
                              │                          │
                              │  "Given these headlines  │
                              │   and intelligence..."   │
                              └───────────┬──────────────┘
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │  AI-Generated Brief      │
                              │                          │
                              │  "Iran faces escalating  │
                              │   pressure as military   │
                              │   movements detected..." │
                              └──────────────────────────┘
```

---

## Parallel Analysis Engine

### `services/parallel-analysis.ts`

```typescript
/**
 * Parallel Analysis Service
 * 
 * Analyzes news headlines from 6 independent perspectives:
 * 1. Keywords - Pattern matching for violence/military/unrest
 * 2. Sentiment - Emotional tone analysis
 * 3. Entities - NER extraction (people, places, orgs)
 * 4. Novelty - Semantic uniqueness detection
 * 5. Velocity - Publication frequency analysis
 * 6. Sources - Cross-verification count
 * 
 * Each perspective scores 0-1, then weighted aggregate.
 * High disagreement flags stories for review.
 */

import type { ClusteredEvent } from '@/types/news';

// ============================================================
// KEYWORD DICTIONARIES
// ============================================================

const KEYWORD_DICTIONARIES = {
  VIOLENCE: [
    'killed', 'dead', 'death', 'shot', 'blood', 'massacre', 'slaughter',
    'fatalities', 'casualties', 'wounded', 'injured', 'murdered', 'execution',
    'crackdown', 'violent', 'clashes', 'gunfire', 'shooting', 'beheaded',
    'torture', 'atrocity', 'ethnic cleansing'
  ],
  
  MILITARY: [
    'war', 'armada', 'invasion', 'airstrike', 'strike', 'missile', 'troops',
    'deployed', 'offensive', 'artillery', 'bomb', 'combat', 'fleet', 'warship',
    'carrier', 'navy', 'airforce', 'deployment', 'mobilization', 'attack',
    'drone', 'ballistic', 'nuclear', 'biological', 'chemical', 'WMD'
  ],
  
  UNREST: [
    'protest', 'protests', 'uprising', 'revolt', 'revolution', 'riot', 'riots',
    'demonstration', 'unrest', 'dissent', 'rebellion', 'insurgent', 'overthrow',
    'coup', 'martial law', 'curfew', 'shutdown', 'blackout', 'general strike'
  ],
  
  FLASHPOINTS: [
    'iran', 'tehran', 'russia', 'moscow', 'putin', 'china', 'beijing', 'xi',
    'taiwan', 'ukraine', 'kyiv', 'zelensky', 'north korea', 'pyongyang', 'kim',
    'israel', 'gaza', 'hamas', 'west bank', 'palestine', 'syria', 'damascus',
    'yemen', 'hezbollah', 'lebanon', 'kremlin', 'pentagon', 'nato', 'wagner',
    'belarus', 'poland', 'baltic', 'taiwan strait', 'south china sea',
    'crimea', 'donbas', 'kashmir', 'korean peninsula'
  ],
  
  BUSINESS_DEMOTE: [
    'ceo', 'earnings', 'stock', 'startup', 'data center', 'datacenter', 
    'revenue', 'quarterly', 'profit', 'investor', 'ipo', 'funding', 
    'valuation', 'dividend', 'share buyback', 'merger', 'acquisition'
  ]
};

// ============================================================
// PERSPECTIVE SCORE TYPES
// ============================================================

export interface PerspectiveScore {
  name: string;
  score: number;        // 0.0 to 1.0
  confidence: number;   // 0.0 to 1.0
  reasoning: string;    // Human-readable explanation
}

export interface AnalyzedHeadline {
  id: string;
  title: string;
  sourceCount: number;
  perspectives: PerspectiveScore[];
  finalScore: number;
  confidence: number;
  disagreement: number;  // Standard deviation between perspectives
  flagged: boolean;      // True if high disagreement or anomaly
  flagReason?: string;
}

export interface AnalysisReport {
  timestamp: number;
  totalHeadlines: number;
  analyzed: AnalyzedHeadline[];
  topByConsensus: AnalyzedHeadline[];      // High confidence scores
  topByDisagreement: AnalyzedHeadline[];   // Controversial/unclear
  missedByKeywords: AnalyzedHeadline[];    // ML caught, keywords missed
  perspectiveCorrelations: Record<string, number>;
}

// ============================================================
// WEIGHTS CONFIGURATION
// ============================================================

const PERSPECTIVE_WEIGHTS: Record<string, number> = {
  keywords: 0.25,   // Most reliable for geopolitical
  sentiment: 0.15,  // Emotional intensity
  entities: 0.20,   // Geographic/political significance
  novelty: 0.10,    // New vs repeated stories
  velocity: 0.15,   // Breaking vs sustained
  sources: 0.15,    // Cross-verification
};

// ============================================================
// ANALYSIS SERVICE
// ============================================================

class ParallelAnalysisService {
  private lastReport: AnalysisReport | null = null;

  /**
   * Main analysis entry point
   * 
   * @param clusters - Clustered news events
   * @returns Full analysis report with scored headlines
   */
  async analyzeClusters(clusters: ClusteredEvent[]): Promise<AnalysisReport> {
    const analyzed: AnalyzedHeadline[] = [];

    // Analyze each cluster
    for (const cluster of clusters) {
      const title = cluster.primaryTitle;
      const titleLower = title.toLowerCase();

      // Collect scores from all perspectives
      const perspectives: PerspectiveScore[] = [];

      // 1. Keyword Analysis (fast, deterministic)
      perspectives.push(this.analyzeKeywords(titleLower, cluster));

      // 2. Sentiment Analysis (if ML available)
      const sentiment = await this.analyzeSentiment(title);
      if (sentiment) perspectives.push(sentiment);

      // 3. Entity Analysis (locations, people, orgs)
      const entities = await this.analyzeEntities(title);
      if (entities) perspectives.push(entities);

      // 4. Novelty Analysis (semantic uniqueness)
      const novelty = await this.analyzeNovelty(title);
      if (novelty) perspectives.push(novelty);

      // 5. Velocity Analysis (publication speed)
      perspectives.push(this.analyzeVelocity(cluster));

      // 6. Source Diversity Analysis
      perspectives.push(this.analyzeSources(cluster));

      // Aggregate scores
      const { finalScore, confidence, disagreement } = 
        this.aggregateScores(perspectives);

      // Flag anomalies
      const flagged = disagreement > 0.3 || 
        (finalScore > 0.5 && this.isLowKeywordScore(perspectives));
      
      const flagReason = flagged
        ? disagreement > 0.3
          ? 'High disagreement between perspectives - needs review'
          : 'ML models flag as important but keyword score low'
        : undefined;

      analyzed.push({
        id: cluster.id,
        title,
        sourceCount: cluster.sourceCount,
        perspectives,
        finalScore,
        confidence,
        disagreement,
        flagged,
        flagReason,
      });
    }

    // Sort by final score
    analyzed.sort((a, b) => b.finalScore - a.finalScore);

    // Generate report sections
    const report: AnalysisReport = {
      timestamp: Date.now(),
      totalHeadlines: clusters.length,
      analyzed,
      topByConsensus: analyzed.filter(a => a.confidence > 0.6).slice(0, 10),
      topByDisagreement: analyzed
        .filter(a => a.disagreement > 0.25)
        .sort((a, b) => b.disagreement - a.disagreement)
        .slice(0, 5),
      missedByKeywords: analyzed.filter(a => {
        const keywordScore = a.perspectives.find(p => p.name === 'keywords')?.score ?? 0;
        const mlAvg = a.perspectives
          .filter(p => p.name !== 'keywords')
          .reduce((sum, p) => sum + p.score, 0) / 
          Math.max(1, a.perspectives.length - 1);
        return mlAvg > 0.5 && keywordScore < 0.3;
      }).slice(0, 5),
      perspectiveCorrelations: this.calculateCorrelations(analyzed),
    };

    this.lastReport = report;
    return report;
  }

  // ============================================================
  // PERSPECTIVE: KEYWORDS
  // ============================================================

  private analyzeKeywords(
    titleLower: string, 
    cluster: ClusteredEvent
  ): PerspectiveScore {
    let score = 0;
    const reasons: string[] = [];

    // Violence keywords
    const violence = KEYWORD_DICTIONARIES.VIOLENCE.filter(kw => 
      titleLower.includes(kw)
    );
    if (violence.length > 0) {
      score += 0.4 + violence.length * 0.1;
      reasons.push(`violence(${violence.slice(0, 3).join(',')})`);
    }

    // Military keywords
    const military = KEYWORD_DICTIONARIES.MILITARY.filter(kw => 
      titleLower.includes(kw)
    );
    if (military.length > 0) {
      score += 0.3 + military.length * 0.08;
      reasons.push(`military(${military.slice(0, 3).join(',')})`);
    }

    // Unrest keywords
    const unrest = KEYWORD_DICTIONARIES.UNREST.filter(kw => 
      titleLower.includes(kw)
    );
    if (unrest.length > 0) {
      score += 0.25 + unrest.length * 0.07;
      reasons.push(`unrest(${unrest.slice(0, 3).join(',')})`);
    }

    // Flashpoint locations (geopolitical hotspots)
    const flashpoint = KEYWORD_DICTIONARIES.FLASHPOINTS.filter(kw => 
      titleLower.includes(kw)
    );
    if (flashpoint.length > 0) {
      score += 0.2 + flashpoint.length * 0.05;
      reasons.push(`flashpoint(${flashpoint.slice(0, 2).join(',')})`);
    }

    // Combo bonus: violence + flashpoint location
    if ((violence.length > 0 || unrest.length > 0) && flashpoint.length > 0) {
      score *= 1.3;
      reasons.push('combo-bonus');
    }

    // Business news demotion
    const business = KEYWORD_DICTIONARIES.BUSINESS_DEMOTE.filter(kw => 
      titleLower.includes(kw)
    );
    if (business.length > 0) {
      score *= 0.4;
      reasons.push(`demoted(${business.slice(0, 2).join(',')})`);
    }

    // Cap at 1.0
    score = Math.min(1, score);

    return {
      name: 'keywords',
      score,
      confidence: 0.8,
      reasoning: reasons.length > 0 ? reasons.join(' + ') : 'no keywords matched',
    };
  }

  // ============================================================
  // PERSPECTIVE: SENTIMENT
  // ============================================================

  private async analyzeSentiment(title: string): Promise<PerspectiveScore | null> {
    try {
      // Use simple heuristic for now
      // In production: Use Transformers.js sentiment model
      const negativeWords = [
        'crisis', 'war', 'attack', 'death', 'killed', 'crash', 'fail', 
        'collapse', 'threat', 'disaster', 'catastrophe', 'emergency'
      ];
      
      const positiveWords = [
        'peace', 'agreement', 'success', 'growth', 'breakthrough', 
        'recovery', 'victory', 'celebrate'
      ];
      
      const titleLower = title.toLowerCase();
      const negCount = negativeWords.filter(w => titleLower.includes(w)).length;
      const posCount = positiveWords.filter(w => titleLower.includes(w)).length;
      
      if (negCount === 0 && posCount === 0) {
        return {
          name: 'sentiment',
          score: 0.3,
          confidence: 0.5,
          reasoning: 'neutral tone',
        };
      }
      
      const isNegative = negCount > posCount;
      const intensity = Math.max(negCount, posCount);
      const score = isNegative 
        ? Math.min(1, 0.4 + intensity * 0.2)  // Negative = higher threat
        : Math.max(0, 0.3 - intensity * 0.1); // Positive = lower threat
      
      return {
        name: 'sentiment',
        score,
        confidence: 0.6 + intensity * 0.1,
        reasoning: isNegative 
          ? `negative(${negCount} indicators)` 
          : `positive(${posCount} indicators)`,
      };
    } catch {
      return null;
    }
  }

  // ============================================================
  // PERSPECTIVE: ENTITIES
  // ============================================================

  private async analyzeEntities(title: string): Promise<PerspectiveScore | null> {
    // Simple entity extraction
    // In production: Use NER model
    
    const entities: { text: string; type: string }[] = [];
    const titleLower = title.toLowerCase();
    
    // Check for countries
    const countries = [
      'iran', 'russia', 'china', 'israel', 'ukraine', 'north korea',
      'syria', 'gaza', 'lebanon', 'yemen', 'saudi arabia', 'turkey'
    ];
    
    for (const country of countries) {
      if (titleLower.includes(country)) {
        entities.push({ text: country, type: 'LOC' });
      }
    }
    
    // Check for leaders
    const leaders = ['putin', 'xi', 'netanyahu', 'zelensky', 'biden', 'khamenei'];
    for (const leader of leaders) {
      if (titleLower.includes(leader)) {
        entities.push({ text: leader, type: 'PER' });
      }
    }
    
    if (entities.length === 0) {
      return {
        name: 'entities',
        score: 0.2,
        confidence: 0.5,
        reasoning: 'no significant entities detected',
      };
    }
    
    // Check if entities are flashpoints
    const geoLocations = entities.filter(e => e.type === 'LOC');
    const geopoliticalLocations = geoLocations.filter(e =>
      KEYWORD_DICTIONARIES.FLASHPOINTS.some(fp => 
        e.text.toLowerCase().includes(fp)
      )
    );
    
    let score = 0.15 + entities.length * 0.05;
    const reasons: string[] = [`entities(${entities.length})`];
    
    if (geopoliticalLocations.length > 0) {
      score += 0.4;
      reasons.push(`geopolitical(${geopoliticalLocations.map(e => e.text).join(',')})`);
    }
    
    return {
      name: 'entities',
      score: Math.min(1, score),
      confidence: 0.7,
      reasoning: reasons.join(' + '),
    };
  }

  // ============================================================
  // PERSPECTIVE: NOVELTY
  // ============================================================

  private recentEmbeddings = new Map<string, number[]>();

  private async analyzeNovelty(title: string): Promise<PerspectiveScore | null> {
    // Simplified novelty check
    // In production: Use sentence embeddings (cosine similarity)
    
    // Check for similarity with recent titles
    let maxSimilarity = 0;
    
    for (const [recentTitle] of this.recentEmbeddings) {
      // Simple word overlap as proxy
      const titleWords = new Set(title.toLowerCase().split(/\s+/));
      const recentWords = new Set(recentTitle.toLowerCase().split(/\s+/));
      const intersection = [...titleWords].filter(w => recentWords.has(w));
      const similarity = intersection.length / Math.max(titleWords.size, recentWords.size);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    // Store for future comparison
    this.recentEmbeddings.set(title, []);
    if (this.recentEmbeddings.size > 100) {
      const firstKey = this.recentEmbeddings.keys().next().value;
      this.recentEmbeddings.delete(firstKey);
    }
    
    const noveltyScore = 1 - maxSimilarity;
    const importanceBoost = noveltyScore > 0.5 ? 0.3 : 0;
    
    return {
      name: 'novelty',
      score: Math.min(1, noveltyScore * 0.7 + importanceBoost),
      confidence: 0.6,
      reasoning: maxSimilarity > 0.7
        ? `similar to recent story (${(maxSimilarity * 100).toFixed(0)}% overlap)`
        : `novel content (${(noveltyScore * 100).toFixed(0)}% unique)`,
    };
  }

  // ============================================================
  // PERSPECTIVE: VELOCITY
  // ============================================================

  private analyzeVelocity(cluster: ClusteredEvent): PerspectiveScore {
    const hourAgo = Date.now() - (60 * 60 * 1000);
    const recentCount = cluster.allItems.filter(
      i => i.pubDate.getTime() > hourAgo
    ).length;
    
    let score = 0.2;
    let reasoning = 'normal velocity';
    
    if (recentCount > 10) {
      score = 0.9;
      reasoning = `viral: +${recentCount}/hr`;
    } else if (recentCount > 5) {
      score = 0.7;
      reasoning = `spike: +${recentCount}/hr`;
    } else if (recentCount > 2) {
      score = 0.5;
      reasoning = `elevated: +${recentCount}/hr`;
    }
    
    return {
      name: 'velocity',
      score,
      confidence: 0.8,
      reasoning,
    };
  }

  // ============================================================
  // PERSPECTIVE: SOURCE DIVERSITY
  // ============================================================

  private analyzeSources(cluster: ClusteredEvent): PerspectiveScore {
    const sources = cluster.sourceCount;
    let score = 0.2;
    let reasoning = '';
    
    if (sources >= 5) {
      score = 0.9;
      reasoning = `${sources} sources - highly confirmed`;
    } else if (sources >= 3) {
      score = 0.7;
      reasoning = `${sources} sources - confirmed`;
    } else if (sources >= 2) {
      score = 0.5;
      reasoning = `${sources} sources - multi-source`;
    } else {
      reasoning = 'single source';
    }
    
    return {
      name: 'sources',
      score,
      confidence: 0.9,
      reasoning,
    };
  }

  // ============================================================
  // SCORE AGGREGATION
  // ============================================================

  private aggregateScores(perspectives: PerspectiveScore[]): {
    finalScore: number;
    confidence: number;
    disagreement: number;
  } {
    if (perspectives.length === 0) {
      return { finalScore: 0, confidence: 0, disagreement: 0 };
    }
    
    let weightedSum = 0;
    let totalWeight = 0;
    let confidenceSum = 0;
    
    for (const p of perspectives) {
      const weight = PERSPECTIVE_WEIGHTS[p.name] ?? 0.1;
      weightedSum += p.score * weight * p.confidence;
      totalWeight += weight;
      confidenceSum += p.confidence;
    }
    
    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const avgConfidence = confidenceSum / perspectives.length;
    
    // Calculate disagreement (standard deviation)
    const scores = perspectives.map(p => p.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
    const disagreement = Math.sqrt(variance);
    
    return {
      finalScore,
      confidence: avgConfidence * (1 - disagreement * 0.5),
      disagreement,
    };
  }

  private isLowKeywordScore(perspectives: PerspectiveScore[]): boolean {
    const keywordScore = perspectives.find(p => p.name === 'keywords')?.score ?? 0;
    return keywordScore < 0.3;
  }

  private calculateCorrelations(
    analyzed: AnalyzedHeadline[]
  ): Record<string, number> {
    // Simplified correlation calculation
    return {};
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  getLastReport(): AnalysisReport | null {
    return this.lastReport;
  }

  getSuggestedImprovements(): string[] {
    if (!this.lastReport) return [];
    
    const suggestions: string[] = [];
    
    if (this.lastReport.missedByKeywords.length > 2) {
      suggestions.push(
        'Consider expanding keyword dictionary to capture ML-detected stories'
      );
    }
    
    const avgDisagreement = this.lastReport.analyzed
      .reduce((sum, a) => sum + a.disagreement, 0) / this.lastReport.analyzed.length;
    
    if (avgDisagreement > 0.25) {
      suggestions.push(
        'High average disagreement detected - review perspective weights'
      );
    }
    
    return suggestions;
  }
}

export const parallelAnalysis = new ParallelAnalysisService();
```

---

## Focal Point Detection

### `services/focal-point-detector.ts`

```typescript
/**
 * Focal Point Detector - Intelligence Synthesis Layer
 * 
 * Correlates news entities with map signals to identify "main characters"
 * that appear across multiple intelligence streams.
 * 
 * Example Analysis:
 * - IRAN mentioned in 12 news clusters
 * - 5 military flights detected near Iran
 * - Internet outage reported in Tehran
 * - Sanctions pressure increased
 * = CRITICAL focal point with rich narrative
 */

import type { ClusteredEvent, FocalPoint, EntityMention } from '@/types/news';
import type { SignalSummary, CountrySignalCluster, SignalType } from './signal-aggregator';

const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  internet_outage: 'internet outage',
  military_flight: 'military flights',
  military_vessel: 'naval vessels',
  protest: 'protests',
  ais_disruption: 'shipping disruption',
  satellite_fire: 'satellite fires',
  radiation_anomaly: 'radiation anomalies',
  temporal_anomaly: 'anomaly detection',
  sanctions_pressure: 'sanctions pressure',
  active_strike: 'active strikes',
};

const SIGNAL_TYPE_ICONS: Record<SignalType, string> = {
  internet_outage: '🌐',
  military_flight: '✈️',
  military_vessel: '⚓',
  protest: '📢',
  ais_disruption: '🚢',
  satellite_fire: '🔥',
  radiation_anomaly: '☢️',
  temporal_anomaly: '📊',
  sanctions_pressure: '🚫',
  active_strike: '💥',
};

class FocalPointDetector {
  private lastSummary: {
    timestamp: Date;
    focalPoints: FocalPoint[];
    aiContext: string;
  } | null = null;

  /**
   * Main analysis: Correlate news with map signals
   */
  analyze(
    clusters: ClusteredEvent[], 
    signalSummary: SignalSummary
  ): { focalPoints: FocalPoint[]; aiContext: string } {
    
    // Step 1: Extract and aggregate entities from news
    const entityMentions = this.extractEntities(clusters);
    
    // Step 2: Build focal points by correlating with signals
    const focalPoints = this.buildFocalPoints(entityMentions, signalSummary);
    
    // Step 3: Generate AI context string
    const aiContext = this.generateAIContext(focalPoints);
    
    this.lastSummary = {
      timestamp: new Date(),
      focalPoints,
      aiContext,
    };
    
    return { focalPoints, aiContext };
  }

  /**
   * Extract entities from news clusters
   */
  private extractEntities(clusters: ClusteredEvent[]): Map<string, EntityMention> {
    const mentions = new Map<string, EntityMention>();
    
    for (const cluster of clusters) {
      // Extract from title
      const entities = this.extractFromText(cluster.primaryTitle);
      
      for (const entity of entities) {
        const existing = mentions.get(entity.id);
        
        if (existing) {
          existing.mentionCount++;
          existing.clusterIds.push(cluster.id);
          if (existing.topHeadlines.length < 3) {
            existing.topHeadlines.push({
              title: cluster.primaryTitle,
              url: cluster.primaryLink,
            });
          }
        } else {
          mentions.set(entity.id, {
            entityId: entity.id,
            entityType: entity.type,
            displayName: entity.name,
            mentionCount: 1,
            avgConfidence: 0.8,
            clusterIds: [cluster.id],
            topHeadlines: [{
              title: cluster.primaryTitle,
              url: cluster.primaryLink,
            }],
          });
        }
      }
    }
    
    return mentions;
  }

  /**
   * Simple entity extraction from text
   */
  private extractFromText(text: string): Array<{id: string; name: string; type: 'country' | 'person' | 'organization'}> {
    const entities: Array<{id: string; name: string; type: 'country' | 'person' | 'organization'}> = [];
    const lowerText = text.toLowerCase();
    
    // Country patterns
    const countries = [
      { id: 'iran', name: 'Iran', patterns: ['iran', 'tehran'] },
      { id: 'russia', name: 'Russia', patterns: ['russia', 'russian', 'moscow', 'putin'] },
      { id: 'china', name: 'China', patterns: ['china', 'chinese', '