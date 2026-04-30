/**
 * Focal Point Detector - Intelligence Synthesis Layer
 * Correlates news entities with map signals to identify critical hotspots
 */

import type { ClusteredEvent, FocalPoint, EntityMention } from './types';

export interface SignalSummary {
  topCountries: CountrySignalCluster[];
}

export interface CountrySignalCluster {
  country: string;
  totalCount: number;
  highSeverityCount: number;
  signalTypes: Set<SignalType>;
  signals: Signal[];
}

export interface Signal {
  type: SignalType;
  severity: 'low' | 'medium' | 'high';
  strikeCount?: number;
  highSeverityStrikeCount?: number;
}

export type SignalType = 
  | 'internet_outage' 
  | 'military_flight' 
  | 'military_vessel'
  | 'protest'
  | 'ais_disruption'
  | 'satellite_fire'
  | 'radiation_anomaly'
  | 'temporal_anomaly'
  | 'sanctions_pressure'
  | 'active_strike';

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

export class FocalPointDetector {
  private lastSummary: {
    timestamp: Date;
    focalPoints: FocalPoint[];
    aiContext: string;
  } | null = null;

  analyze(
    clusters: ClusteredEvent[], 
    signalSummary: SignalSummary
  ): { focalPoints: FocalPoint[]; aiContext: string } {
    
    const entityMentions = this.extractEntities(clusters);
    const focalPoints = this.buildFocalPoints(entityMentions, signalSummary);
    const aiContext = this.generateAIContext(focalPoints);
    
    this.lastSummary = {
      timestamp: new Date(),
      focalPoints,
      aiContext,
    };
    
    return { focalPoints, aiContext };
  }

  private extractEntities(clusters: ClusteredEvent[]): Map<string, EntityMention> {
    const mentions = new Map<string, EntityMention>();
    
    for (const cluster of clusters) {
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

  private extractFromText(text: string): Array<{id: string; name: string; type: 'country' | 'person' | 'organization'}> {
    const entities: Array<{id: string; name: string; type: 'country' | 'person' | 'organization'}> = [];
    const lowerText = text.toLowerCase();
    
    const countries = [
      { id: 'iran', name: 'Iran', patterns: ['iran', 'tehran'] },
      { id: 'russia', name: 'Russia', patterns: ['russia', 'russian', 'moscow', 'putin'] },
      { id: 'china', name: 'China', patterns: ['china', 'chinese', 'beijing', 'xi'] },
      { id: 'israel', name: 'Israel', patterns: ['israel', 'israeli', 'gaza', 'netanyahu'] },
      { id: 'ukraine', name: 'Ukraine', patterns: ['ukraine', 'ukrainian', 'kyiv', 'zelensky'] },
      { id: 'north_korea', name: 'North Korea', patterns: ['north korea', 'pyongyang', 'kim'] },
      { id: 'syria', name: 'Syria', patterns: ['syria', 'syrian', 'damascus'] },
      { id: 'yemen', name: 'Yemen', patterns: ['yemen', 'yemeni', 'houthi'] },
      { id: 'lebanon', name: 'Lebanon', patterns: ['lebanon', 'lebanese', 'hezbollah'] },
    ];
    
    for (const country of countries) {
      if (country.patterns.some(p => lowerText.includes(p))) {
        entities.push({ id: country.id, name: country.name, type: 'country' });
      }
    }
    
    return entities;
  }

  private buildFocalPoints(
    entityMentions: Map<string, EntityMention>,
    signalSummary: SignalSummary
  ): FocalPoint[] {
    const focalPoints: FocalPoint[] = [];
    const countrySignals = new Map<string, CountrySignalCluster>();

    for (const cluster of signalSummary.topCountries) {
      countrySignals.set(cluster.country, cluster);
    }

    for (const [entityId, mention] of entityMentions) {
      const signals = countrySignals.get(entityId);
      
      const focalPoint = this.createFocalPoint(mention, signals, entityId);
      if (focalPoint.focalScore > 20) {
        focalPoints.push(focalPoint);
      }
    }

    return focalPoints.sort((a, b) => b.focalScore - a.focalScore);
  }

  private createFocalPoint(
    mention: EntityMention,
    signals: CountrySignalCluster | undefined,
    signalCountry: string | undefined
  ): FocalPoint {
    const newsScore = this.calculateNewsScore(mention);
    const signalScore = signals ? this.calculateSignalScore(signals) : 0;
    const correlationBonus = this.calculateCorrelationBonus(mention, signals);
    const rawScore = newsScore + signalScore + correlationBonus;

    const signalTypes = signals ? Array.from(signals.signalTypes) : [];
    const urgency = this.determineUrgency(rawScore, signalTypes.length);
    const urgencyMultiplier = urgency === 'critical' ? 1.3 : urgency === 'elevated' ? 1.15 : 1.0;
    const focalScore = Math.min(100, rawScore * urgencyMultiplier);

    const signalDescriptions = signals
      ? signalTypes.map(type => {
          const count = signals.signals.filter(s => s.type === type).length;
          return `${count} ${SIGNAL_TYPE_LABELS[type]}`;
        })
      : [];

    const narrative = this.generateNarrative(mention, signals, signalTypes);

    return {
      id: `fp-${mention.entityId}`,
      entityId: mention.entityId,
      entityType: mention.entityType,
      displayName: mention.displayName,
      newsMentions: mention.mentionCount,
      newsVelocity: mention.mentionCount / 24,
      topHeadlines: mention.topHeadlines,
      signalTypes,
      signalCount: signals?.totalCount || 0,
      highSeverityCount: signals?.highSeverityCount || 0,
      signalDescriptions,
      focalScore,
      urgency,
      narrative,
      correlationEvidence: this.getCorrelationEvidence(mention, signals),
    };
  }

  private calculateNewsScore(mention: EntityMention): number {
    const base = Math.min(20, mention.mentionCount * 4);
    const velocity = Math.min(10, (mention.mentionCount / 24) * 2);
    const confidence = mention.avgConfidence * 10;
    return base + velocity + confidence;
  }

  private calculateSignalScore(signals: CountrySignalCluster): number {
    const nonStrike = signals.signals.filter(s => s.type !== 'active_strike');
    const types = new Set(nonStrike.map(s => s.type));
    const typeBonus = types.size * 10;
    const countBonus = Math.min(15, nonStrike.length * 3);
    const severityBonus = nonStrike.filter(s => s.severity === 'high').length * 5;
    return typeBonus + countBonus + severityBonus;
  }

  private calculateCorrelationBonus(
    mention: EntityMention,
    signals: CountrySignalCluster | undefined
  ): number {
    let bonus = 0;

    if (mention.mentionCount > 0 && signals && signals.totalCount > 0) {
      bonus += 10;
    }

    if (signals && mention.topHeadlines.some(h => {
      const lower = h.title.toLowerCase();
      return (signals.signalTypes.has('military_flight') && /military|troops|forces/.test(lower)) ||
             (signals.signalTypes.has('military_vessel') && /navy|naval|ships|fleet/.test(lower)) ||
             (signals.signalTypes.has('protest') && /protest|demonstrat|unrest|riot/.test(lower)) ||
             (signals.signalTypes.has('internet_outage') && /internet|blackout|outage/.test(lower));
    })) {
      bonus += 5;
    }

    return bonus;
  }

  private determineUrgency(score: number, signalTypeCount: number): 'watch' | 'elevated' | 'critical' {
    if (score > 70 || signalTypeCount >= 3) return 'critical';
    if (score > 50 || signalTypeCount >= 2) return 'elevated';
    return 'watch';
  }

  private generateNarrative(
    mention: EntityMention,
    signals: CountrySignalCluster | undefined,
    signalTypes: SignalType[]
  ): string {
    const parts: string[] = [];

    if (mention.mentionCount > 0) {
      parts.push(`${mention.mentionCount} news mentions`);
    }

    if (signals && signalTypes.length > 0) {
      const signalParts = signalTypes.map(type => {
        const count = signals.signals.filter(s => s.type === type).length;
        return `${count} ${SIGNAL_TYPE_LABELS[type]}`;
      });
      parts.push(signalParts.join(', '));
    }

    if (mention.topHeadlines.length > 0 && mention.topHeadlines[0]) {
      const headline = mention.topHeadlines[0].title.slice(0, 60);
      parts.push(`"${headline}..."`);
    }

    return parts.join(' | ');
  }

  private getCorrelationEvidence(
    mention: EntityMention,
    signals: CountrySignalCluster | undefined
  ): string[] {
    const evidence: string[] = [];

    if (mention.mentionCount > 0 && signals && signals.totalCount > 0) {
      evidence.push(`${mention.displayName} appears in both news (${mention.mentionCount}) and map signals (${signals.totalCount})`);
    }

    if (signals && signals.signalTypes.size >= 2) {
      const types = Array.from(signals.signalTypes).map(t => SIGNAL_TYPE_LABELS[t]);
      evidence.push(`Multiple signal convergence: ${types.join(' + ')}`);
    }

    return evidence;
  }

  private generateAIContext(focalPoints: FocalPoint[]): string {
    if (focalPoints.length === 0) {
      return '';
    }

    const lines: string[] = ['[INTELLIGENCE SYNTHESIS]'];

    const critical = focalPoints.filter(fp => fp.urgency === 'critical').slice(0, 3);
    const elevated = focalPoints.filter(fp => fp.urgency === 'elevated').slice(0, 3);
    const correlatedFPs = focalPoints.filter(fp => fp.newsMentions > 0 && fp.signalCount > 0).slice(0, 5);

    if (critical.length > 0) {
      lines.push('', 'CRITICAL FOCAL POINTS:');
      for (const fp of critical) {
        const icons = fp.signalTypes.map(t => SIGNAL_TYPE_ICONS[t as SignalType]).join('');
        lines.push(`- ${fp.displayName} [CRITICAL] ${icons}: ${fp.narrative}`);
      }
    }

    if (elevated.length > 0) {
      lines.push('', 'ELEVATED WATCH:');
      for (const fp of elevated) {
        lines.push(`- ${fp.displayName}: ${fp.newsMentions} news, ${fp.signalCount} signals`);
      }
    }

    return lines.join('\n');
  }

  getLastSummary() {
    return this.lastSummary;
  }

  getSignalIcons(signalTypes: string[]): string {
    return signalTypes.map(t => SIGNAL_TYPE_ICONS[t as SignalType] || '').join(' ');
  }
}

export const focalPointDetector = new FocalPointDetector();
