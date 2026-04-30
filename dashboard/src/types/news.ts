export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type EventCategory =
  | 'conflict'
  | 'protest'
  | 'disaster'
  | 'diplomatic'
  | 'economic'
  | 'terrorism'
  | 'cyber'
  | 'health'
  | 'environmental'
  | 'military'
  | 'crime'
  | 'infrastructure'
  | 'tech'
  | 'general';

export type StoryPhase = 'breaking' | 'developing' | 'sustained' | 'fading';

export interface ThreatClassification {
  level: ThreatLevel;
  category: EventCategory;
  confidence: number;
  source: 'keyword' | 'ml' | 'llm';
}

export interface StoryMeta {
  firstSeen: number;
  mentionCount: number;
  sourceCount: number;
  phase: StoryPhase;
}

export type VelocityLevel = 'normal' | 'elevated' | 'spike' | 'viral';
export type SentimentType = 'negative' | 'neutral' | 'positive';

export interface VelocityMetrics {
  sourcesPerHour: number;
  level: VelocityLevel;
  trend: 'rising' | 'stable' | 'falling';
  sentiment: SentimentType;
  sentimentScore: number;
}

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  snippet?: string;
  pubDate: Date;
  fetchedAt: Date;
  isAlert: boolean;
  tier: number;
  threat?: ThreatClassification;
  lat?: number;
  lon?: number;
  locationName?: string;
  lang: string;
  importanceScore: number;
  corroborationCount?: number;
  storyMeta?: StoryMeta;
  velocity?: VelocityMetrics;
  imageUrl?: string;
  tags?: string[];
}

export interface Feed {
  name: string;
  url: string;
  category: string;
  lang: string;
  tier?: number;
  region?: string;
}

export interface NewsCategory {
  id: string;
  name: string;
  feeds: Feed[];
  icon?: string;
}

export interface AggregationResult {
  items: NewsItem[];
  byCategory: Map<string, NewsItem[]>;
  breakingAlerts: NewsItem[];
  totalSources: number;
  fetchTime: number;
}

export type EntityType = 'country' | 'person' | 'organization' | 'location';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  aliases: string[];
  related?: string[];
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

export interface Signal {
  type: SignalType;
  lat: number;
  lon: number;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  description: string;
}

export interface FocalPoint {
  id: string;
  entityId: string;
  entityType: EntityType;
  displayName: string;
  newsMentions: number;
  newsVelocity: number;
  topHeadlines: { title: string; url: string }[];
  signalTypes: SignalType[];
  signalCount: number;
  highSeverityCount: number;
  signalDescriptions: string[];
  focalScore: number;
  urgency: 'watch' | 'elevated' | 'critical';
  narrative: string;
  correlationEvidence: string[];
}
