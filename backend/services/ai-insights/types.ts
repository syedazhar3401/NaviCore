export interface BackendThreatClassification {
  level: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  confidence: number;
  source?: string;
}

export interface BackendNewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  snippet?: string;
  description?: string;
  pubDate: string | Date;
  fetchedAt?: string | Date;
  isAlert?: boolean;
  tier?: number;
  threat?: BackendThreatClassification;
  lat?: number | null;
  lon?: number | null;
  locationName?: string | null;
  region?: string | null;
  lang?: string;
  importanceScore?: number;
  tags?: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  description?: string;
  pubDate: Date;
  source: string;
  sourceTier: 'tier1' | 'tier2' | 'tier3';
  categories?: string[];
  tier?: number;
  threat?: BackendThreatClassification;
  locationName?: string | null;
  region?: string | null;
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

export interface AIInsightResponse {
  clusters: ClusteredEvent[];
  analysisReport: AnalysisReport;
  focalPoints: FocalPoint[];
  aiContext: string;
  summary: SummarizationResult;
  generatedAt: string;
  cached?: boolean;
}

export type SummarizationProvider = 'groq' | 'openrouter' | 'deterministic' | 'cache';

export interface SummarizationResult {
  summary: string;
  provider: SummarizationProvider;
  model: string;
  cached: boolean;
}

export interface SummarizeOptions {
  skipCloudProviders?: boolean;
  bodies?: string[];
}

export type ProgressCallback = (step: number, total: number, message: string) => void;
