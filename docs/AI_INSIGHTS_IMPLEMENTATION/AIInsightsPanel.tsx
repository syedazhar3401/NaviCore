/**
 * AI Insights Panel Component
 * Displays AI-generated summaries and focal points
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { AIInsight, FocalPoint, AnalyzedHeadline } from './types';
import { generateSummary } from './groq-service';
import { parallelAnalysis } from './parallel-analysis';
import { focalPointDetector } from './focal-point-detector';
import type { ClusteredEvent } from './types';

interface AIInsightsPanelProps {
  clusters: ClusteredEvent[];
  signalSummary?: {
    topCountries: Array<{
      country: string;
      totalCount: number;
      highSeverityCount: number;
      signalTypes: Set<string>;
      signals: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
      }>;
    }>;
  };
  className?: string;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  clusters,
  signalSummary,
  className = '',
}) => {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ step: 0, total: 3, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'focal' | 'stories'>('summary');

  const generateInsights = useCallback(async () => {
    if (clusters.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Parallel Analysis
      setProgress({ step: 1, total: 3, message: 'Analyzing news perspectives...' });
      const analysisReport = await parallelAnalysis.analyzeClusters(clusters);
      const topStories = analysisReport.analyzed.slice(0, 10);

      // Step 2: Focal Point Detection
      setProgress({ step: 2, total: 3, message: 'Detecting focal points...' });
      const { focalPoints, aiContext } = signalSummary
        ? focalPointDetector.analyze(clusters, {
            topCountries: signalSummary.topCountries.map(c => ({
              ...c,
              signalTypes: new Set(c.signalTypes),
            })),
          })
        : { focalPoints: [], aiContext: '' };

      // Step 3: Generate AI Summary
      setProgress({ step: 3, total: 3, message: 'Generating AI summary...' });
      const headlines = topStories.map(s => s.title);
      const summaryResult = await generateSummary(
        headlines,
        (step, total, message) => setProgress({ step, total, message }),
        aiContext,
        'en',
        { bodies: clusters.slice(0, 5).map(c => c.allItems[0]?.description || '') }
      );

      if (summaryResult) {
        setInsight({
          id: `insight-${Date.now()}`,
          summary: summaryResult.summary,
          focalPoints: focalPoints.slice(0, 5),
          topStories: topStories.slice(0, 5),
          generatedAt: new Date(),
          provider: summaryResult.provider,
          model: summaryResult.model,
        });
      } else {
        setError('Failed to generate summary. All providers unavailable.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [clusters, signalSummary]);

  // Auto-generate on mount and every 5 minutes
  useEffect(() => {
    generateInsights();
    const interval = setInterval(generateInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [generateInsights]);

  if (isLoading) {
    return (
      <div className={`ai-insights-panel loading ${className}`}>
        <div className="panel-header">
          <h3>🤖 AI Intelligence Analysis</h3>
        </div>
        <div className="loading-state">
          <div className="spinner" />
          <p>{progress.message}</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(progress.step / progress.total) * 100}%` }}
            />
          </div>
          <span className="step-indicator">
            Step {progress.step} of {progress.total}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`ai-insights-panel error ${className}`}>
        <div className="panel-header">
          <h3>🤖 AI Intelligence Analysis</h3>
        </div>
        <div className="error-state">
          <p>⚠️ {error}</p>
          <button onClick={generateInsights} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className={`ai-insights-panel empty ${className}`}>
        <div className="panel-header">
          <h3>🤖 AI Intelligence Analysis</h3>
        </div>
        <p>No insights available yet.</p>
        <button onClick={generateInsights} className="generate-btn">
          Generate Insights
        </button>
      </div>
    );
  }

  return (
    <div className={`ai-insights-panel ${className}`}>
      <div className="panel-header">
        <h3>🤖 AI Intelligence Analysis</h3>
        <div className="meta">
          <span className="provider">{insight.provider}</span>
          <span className="timestamp">
            {insight.generatedAt.toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={activeTab === 'focal' ? 'active' : ''}
          onClick={() => setActiveTab('focal')}
        >
          Focal Points ({insight.focalPoints.length})
        </button>
        <button
          className={activeTab === 'stories' ? 'active' : ''}
          onClick={() => setActiveTab('stories')}
        >
          Top Stories
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'summary' && (
          <div className="summary-tab">
            <div className="ai-summary">
              <p>{insight.summary}</p>
            </div>
          </div>
        )}

        {activeTab === 'focal' && (
          <div className="focal-tab">
            {insight.focalPoints.map(fp => (
              <FocalPointCard key={fp.id} focalPoint={fp} />
            ))}
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="stories-tab">
            {insight.topStories.map((story, i) => (
              <StoryCard key={story.id} story={story} rank={i + 1} />
            ))}
          </div>
        )}
      </div>

      <button onClick={generateInsights} className="refresh-btn">
        Refresh Analysis
      </button>
    </div>
  );
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

const FocalPointCard: React.FC<{ focalPoint: FocalPoint }> = ({ focalPoint }) => {
  const urgencyColors = {
    watch: '#4a9eff',
    elevated: '#ff9f43',
    critical: '#ff4757',
  };

  return (
    <div 
      className={`focal-point-card ${focalPoint.urgency}`}
      style={{ borderLeftColor: urgencyColors[focalPoint.urgency] }}
    >
      <div className="fp-header">
        <h4>{focalPoint.displayName}</h4>
        <span 
          className="urgency-badge"
          style={{ backgroundColor: urgencyColors[focalPoint.urgency] }}
        >
          {focalPoint.urgency.toUpperCase()}
        </span>
      </div>
      
      <div className="fp-stats">
        <span>📰 {focalPoint.newsMentions} mentions</span>
        <span>📡 {focalPoint.signalCount} signals</span>
        <span>📊 Score: {focalPoint.focalScore.toFixed(0)}</span>
      </div>

      <p className="fp-narrative">{focalPoint.narrative}</p>

      {focalPoint.signalTypes.length > 0 && (
        <div className="fp-signals">
          {focalPoint.signalTypes.map(type => (
            <span key={type} className="signal-tag">
              {getSignalIcon(type)} {type.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}

      {focalPoint.topHeadlines.length > 0 && (
        <div className="fp-headlines">
          <strong>Top Headline:</strong>
          <a href={focalPoint.topHeadlines[0].url} target="_blank" rel="noopener">
            {focalPoint.topHeadlines[0].title}
          </a>
        </div>
      )}
    </div>
  );
};

const StoryCard: React.FC<{ story: AnalyzedHeadline; rank: number }> = ({ 
  story, 
  rank 
}) => {
  const scoreColor = story.finalScore > 0.7 
    ? '#ff4757' 
    : story.finalScore > 0.4 
    ? '#ff9f43' 
    : '#4a9eff';

  return (
    <div className={`story-card ${story.flagged ? 'flagged' : ''}`}>
      <div className="story-rank">#{rank}</div>
      <div className="story-content">
        <h4>{story.title}</h4>
        <div className="story-meta">
          <span style={{ color: scoreColor }}>
            Score: {(story.finalScore * 100).toFixed(0)}
          </span>
          <span>Sources: {story.sourceCount}</span>
          {story.flagged && <span className="flag-badge">⚠️ {story.flagReason}</span>}
        </div>
        <div className="perspectives">
          {story.perspectives.map(p => (
            <span key={p.name} className="perspective-tag" title={p.reasoning}>
              {p.name}: {(p.score * 100).toFixed(0)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

function getSignalIcon(type: string): string {
  const icons: Record<string, string> = {
    internet_outage: '🌐',
    military_flight: '✈️',
    military_vessel: '⚓',
    protest: '📢',
    ais_disruption: '🚢',
    satellite_fire: '🔥',
    radiation_anomaly: '☢️',
    sanctions_pressure: '🚫',
    active_strike: '💥',
  };
  return icons[type] || '📍';
}

export default AIInsightsPanel;
