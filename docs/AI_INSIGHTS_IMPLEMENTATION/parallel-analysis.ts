/**
 * Parallel Analysis Service
 * Analyzes news from 6 independent perspectives
 */

import type { ClusteredEvent, PerspectiveScore, AnalyzedHeadline, AnalysisReport } from './types';

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

const PERSPECTIVE_WEIGHTS: Record<string, number> = {
  keywords: 0.25,
  sentiment: 0.15,
  entities: 0.20,
  novelty: 0.10,
  velocity: 0.15,
  sources: 0.15,
};

class ParallelAnalysisService {
  private lastReport: AnalysisReport | null = null;
  private recentEmbeddings = new Map<string, number[]>();

  async analyzeClusters(clusters: ClusteredEvent[]): Promise<AnalysisReport> {
    const analyzed: AnalyzedHeadline[] = [];

    for (const cluster of clusters) {
      const title = cluster.primaryTitle;
      const titleLower = title.toLowerCase();

      const perspectives: PerspectiveScore[] = [];
      perspectives.push(this.analyzeKeywords(titleLower, cluster));
      
      const sentiment = await this.analyzeSentiment(title);
      if (sentiment) perspectives.push(sentiment);

      const entities = await this.analyzeEntities(title);
      if (entities) perspectives.push(entities);

      const novelty = await this.analyzeNovelty(title);
      if (novelty) perspectives.push(novelty);

      perspectives.push(this.analyzeVelocity(cluster));
      perspectives.push(this.analyzeSources(cluster));

      const { finalScore, confidence, disagreement } = this.aggregateScores(perspectives);

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

    analyzed.sort((a, b) => b.finalScore - a.finalScore);

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
      perspectiveCorrelations: {},
    };

    this.lastReport = report;
    return report;
  }

  private analyzeKeywords(titleLower: string, cluster: ClusteredEvent): PerspectiveScore {
    let score = 0;
    const reasons: string[] = [];

    const violence = KEYWORD_DICTIONARIES.VIOLENCE.filter(kw => titleLower.includes(kw));
    if (violence.length > 0) {
      score += 0.4 + violence.length * 0.1;
      reasons.push(`violence(${violence.slice(0, 3).join(',')})`);
    }

    const military = KEYWORD_DICTIONARIES.MILITARY.filter(kw => titleLower.includes(kw));
    if (military.length > 0) {
      score += 0.3 + military.length * 0.08;
      reasons.push(`military(${military.slice(0, 3).join(',')})`);
    }

    const unrest = KEYWORD_DICTIONARIES.UNREST.filter(kw => titleLower.includes(kw));
    if (unrest.length > 0) {
      score += 0.25 + unrest.length * 0.07;
      reasons.push(`unrest(${unrest.slice(0, 3).join(',')})`);
    }

    const flashpoint = KEYWORD_DICTIONARIES.FLASHPOINTS.filter(kw => titleLower.includes(kw));
    if (flashpoint.length > 0) {
      score += 0.2 + flashpoint.length * 0.05;
      reasons.push(`flashpoint(${flashpoint.slice(0, 2).join(',')})`);
    }

    if ((violence.length > 0 || unrest.length > 0) && flashpoint.length > 0) {
      score *= 1.3;
      reasons.push('combo-bonus');
    }

    const business = KEYWORD_DICTIONARIES.BUSINESS_DEMOTE.filter(kw => titleLower.includes(kw));
    if (business.length > 0) {
      score *= 0.4;
      reasons.push(`demoted(${business.slice(0, 2).join(',')})`);
    }

    score = Math.min(1, score);

    return {
      name: 'keywords',
      score,
      confidence: 0.8,
      reasoning: reasons.length > 0 ? reasons.join(' + ') : 'no keywords matched',
    };
  }

  private async analyzeSentiment(title: string): Promise<PerspectiveScore | null> {
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
      ? Math.min(1, 0.4 + intensity * 0.2)
      : Math.max(0, 0.3 - intensity * 0.1);
    
    return {
      name: 'sentiment',
      score,
      confidence: 0.6 + intensity * 0.1,
      reasoning: isNegative 
        ? `negative(${negCount} indicators)` 
        : `positive(${posCount} indicators)`,
    };
  }

  private async analyzeEntities(title: string): Promise<PerspectiveScore | null> {
    const entities: { text: string; type: string }[] = [];
    const titleLower = title.toLowerCase();
    
    const countries = [
      'iran', 'russia', 'china', 'israel', 'ukraine', 'north korea',
      'syria', 'gaza', 'lebanon', 'yemen', 'saudi arabia', 'turkey'
    ];
    
    for (const country of countries) {
      if (titleLower.includes(country)) {
        entities.push({ text: country, type: 'LOC' });
      }
    }
    
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
    
    const geoLocations = entities.filter(e => e.type === 'LOC');
    const geopoliticalLocations = geoLocations.filter(e =>
      KEYWORD_DICTIONARIES.FLASHPOINTS.some(fp => e.text.toLowerCase().includes(fp))
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

  private async analyzeNovelty(title: string): Promise<PerspectiveScore | null> {
    let maxSimilarity = 0;
    
    for (const [recentTitle] of this.recentEmbeddings) {
      const titleWords = new Set(title.toLowerCase().split(/\s+/));
      const recentWords = new Set(recentTitle.toLowerCase().split(/\s+/));
      const intersection = [...titleWords].filter(w => recentWords.has(w));
      const similarity = intersection.length / Math.max(titleWords.size, recentWords.size);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
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

  getLastReport(): AnalysisReport | null {
    return this.lastReport;
  }
}

export const parallelAnalysis = new ParallelAnalysisService();
