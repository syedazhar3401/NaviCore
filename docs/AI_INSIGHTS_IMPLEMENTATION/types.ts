/**
 * Type definitions for AI Insights system
 */

// ============================================================
// NEWS TYPES
// ============================================================

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  description?: string;
  pubDate: Date;
  source: string;
  sourceTier: 'tier1' | 'tier2' | 'tier3';
  categories?: string[];
}

export interface ClusteredEvent {
  id: string;
  primaryTitle: string;
  primaryLink: string;
  allItems: NewsItem[];
  sourceCount: number;
  uniqueSources: string[];
  earliestPubDate: Date;
  latestPubDate: Date;
  threatClassification?: ThreatClassification;
  importanceScore: number;
}

export interface ThreatClassification {
  level: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  keywords: string[];
  reasoning: string;
}

export interface EntityMention {
  entityId: string;
  entityType: 'country' | 'person' | 'organization';
  displayName: string;
  mentionCount: number;
  avgConfidence: number;
  clusterIds: string[];
  topHeadlines: { title: string; url: string }[];
}

// ============================================================
// FOCAL POINT TYPES
// ============================================================

export interface FocalPoint {
  id: string;
  entityId: string;
  entityType: 'country' | 'person' | 'organization';
  displayName: string;
  newsMentions: number;
  newsVelocity: number;
  topHeadlines: { title: string; url: string }[];
  signalTypes: string[];
  signalCount: number;
  highSeverityCount: number;
  signalDescriptions: string[];
  focalScore: number;
  urgency: 'watch' | 'elevated' | 'critical';
  narrative: string;
  correlationEvidence: string[];
}

export interface FocalPointSummary {
  timestamp: Date;
  focalPoints: FocalPoint[];
  aiContext: string;
}

// ============================================================
// ANALYSIS TYPES
// ============================================================

export interface PerspectiveScore {
  name: string;
  score: number;
  confidence: number;
  reasoning: string;
}

export interface AnalyzedHeadline {
  id: string;
  title: string;
  sourceCount: number;
  perspectives: PerspectiveScore[];
  finalScore: number;
  confidence: number;
  disagreement: number;
  flagged: boolean;
  flagReason?: string;
}

export interface AnalysisReport {
  timestamp: number;
  totalHeadlines: number;
  analyzed: AnalyzedHeadline[];
  topByConsensus: AnalyzedHeadline[];
  topByDisagreement: AnalyzedHeadline[];
  missedByKeywords: AnalyzedHeadline[];
  perspectiveCorrelations: Record<string, number>;
}

// ============================================================
// AI INSIGHTS PANEL TYPES
// ============================================================

export interface AIInsight {
  id: string;
  summary: string;
  focalPoints: FocalPoint[];
  topStories: AnalyzedHeadline[];
  generatedAt: Date;
  provider: string;
  model: string;
}

export interface AIInsightsState {
  isLoading: boolean;
  currentInsight: AIInsight | null;
  error: string | null;
  lastUpdated: Date | null;
}
