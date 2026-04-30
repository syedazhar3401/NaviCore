import type { NewsItem } from './news';

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

export interface AnalysisReport {
  timestamp: number;
  totalHeadlines: number;
  analyzed: AnalyzedHeadline[];
  topByConsensus: AnalyzedHeadline[];
  topByDisagreement: AnalyzedHeadline[];
  missedByKeywords: AnalyzedHeadline[];
  perspectiveCorrelations: Record<string, number>;
}

export interface SummarizationResult {
  summary: string;
  provider: 'groq' | 'openrouter' | 'deterministic' | 'cache';
  model: string;
  cached: boolean;
}

export interface ClusteredEvent {
  id: string;
  primaryTitle: string;
  primaryLink: string;
  allItems: NewsItem[];
  sourceCount: number;
  uniqueSources: string[];
  earliestPubDate: string;
  latestPubDate: string;
  importanceScore: number;
}

export interface AIInsightsResponse {
  clusters: ClusteredEvent[];
  analysisReport: AnalysisReport;
  focalPoints: FocalPoint[];
  aiContext: string;
  summary: SummarizationResult;
  generatedAt: string;
  cached?: boolean;
}
