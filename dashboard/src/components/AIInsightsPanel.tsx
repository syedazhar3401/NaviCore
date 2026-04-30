import { useCallback, useEffect, useState } from 'react';
import type { NewsItem } from '@/types/news';
import type { AIInsightsResponse, AnalyzedHeadline, FocalPoint } from '@/types/ai-insights';
import { analyzeNewsInsights } from '@/services/ai-insights';
import { formatTimeAgo } from '@/services/news-aggregator';

interface AIInsightsPanelProps {
  items: NewsItem[];
  isLoadingNews?: boolean;
  newsError?: string | null;
  onRefreshNews?: () => Promise<void> | void;
  className?: string;
}

export default function AIInsightsPanel({
  items,
  isLoadingNews = false,
  newsError = null,
  onRefreshNews,
  className = '',
}: AIInsightsPanelProps) {
  const [insight, setInsight] = useState<AIInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'focal' | 'stories'>('summary');

  const generateInsights = useCallback(async () => {
    if (items.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await analyzeNewsInsights(items);
      setInsight(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI insights');
    } finally {
      setIsLoading(false);
    }
  }, [items]);

  useEffect(() => {
    if (items.length > 0 && !insight && !isLoading) {
      generateInsights();
    }
  }, [generateInsights, insight, isLoading, items.length]);

  const handleRefresh = async () => {
    if (onRefreshNews) await onRefreshNews();
    await generateInsights();
  };

  return (
    <div className={`ai-insights-page ${className}`}>
      <div className="page-header">
        <div>
          <div className="page-title">AI Intelligence Brief</div>
          <div className="page-subtitle">AI synthesis from real-time global news and risk signals</div>
        </div>
        <button className="ai-refresh-btn" onClick={handleRefresh} disabled={isLoading || isLoadingNews || items.length === 0}>
          {isLoading || isLoadingNews ? 'Analyzing…' : 'Refresh Analysis'}
        </button>
      </div>

      {newsError && (
        <div className="ai-state-card ai-error">
          <strong>News feed unavailable</strong>
          <span>{newsError}</span>
        </div>
      )}

      {isLoadingNews ? (
        <LoadingCard message="Fetching live news for analysis..." />
      ) : items.length === 0 ? (
        <div className="ai-state-card">
          <strong>No news items available</strong>
          <span>Start the backend and refresh the page to load live intelligence data.</span>
        </div>
      ) : isLoading ? (
        <LoadingCard message="Running AI analysis across headlines, focal points, and source velocity..." />
      ) : error ? (
        <div className="ai-state-card ai-error">
          <strong>Unable to generate insights</strong>
          <span>{error}</span>
          <button className="ai-secondary-btn" onClick={generateInsights}>Retry</button>
        </div>
      ) : insight ? (
        <div className="ai-insights-panel">
          <div className="ai-panel-header">
            <div>
              <h3>Analysis Complete</h3>
              <p>
                {insight.analysisReport.totalHeadlines} clusters analyzed · {insight.focalPoints.length} focal points · {insight.cached ? 'cached' : 'fresh'}
              </p>
            </div>
            <div className="ai-provider-pill">
              {insight.summary.provider} · {insight.summary.model}
            </div>
          </div>

          <div className="ai-tabs">
            <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>Summary</button>
            <button className={activeTab === 'focal' ? 'active' : ''} onClick={() => setActiveTab('focal')}>Focal Points ({insight.focalPoints.length})</button>
            <button className={activeTab === 'stories' ? 'active' : ''} onClick={() => setActiveTab('stories')}>Top Stories</button>
          </div>

          {activeTab === 'summary' && (
            <div className="ai-summary-tab">
              <div className="ai-summary-card">
                <div className="ai-card-label">AI Brief</div>
                <p>{insight.summary.summary}</p>
              </div>
              {insight.aiContext && (
                <div className="ai-context-card">
                  <div className="ai-card-label">Focal-Point Context</div>
                  <pre>{insight.aiContext}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'focal' && (
            <div className="ai-focal-grid">
              {insight.focalPoints.length > 0 ? insight.focalPoints.map(fp => (
                <FocalPointCard key={fp.id} focalPoint={fp} />
              )) : <div className="ai-empty-inline">No focal points above the risk threshold.</div>}
            </div>
          )}

          {activeTab === 'stories' && (
            <div className="ai-stories-list">
              {insight.analysisReport.analyzed.slice(0, 10).map((story, index) => (
                <StoryCard key={story.id} story={story} rank={index + 1} />
              ))}
            </div>
          )}

          <div className="ai-footer-meta">
            Generated {formatTimeAgo(new Date(insight.generatedAt))}
          </div>
        </div>
      ) : (
        <div className="ai-state-card">
          <strong>Ready to analyze</strong>
          <span>{items.length} live news items loaded.</span>
          <button className="ai-secondary-btn" onClick={generateInsights}>Generate Insights</button>
        </div>
      )}
    </div>
  );
}

function LoadingCard({ message }: { message: string }) {
  return (
    <div className="ai-state-card">
      <div className="spinner" />
      <strong>{message}</strong>
      <span>This can take a few seconds on the first run.</span>
    </div>
  );
}

function FocalPointCard({ focalPoint }: { focalPoint: FocalPoint }) {
  const urgencyColors = {
    watch: '#4a9eff',
    elevated: '#ff9f43',
    critical: '#ff4757',
  };

  return (
    <div className={`ai-focal-card ${focalPoint.urgency}`} style={{ borderLeftColor: urgencyColors[focalPoint.urgency] }}>
      <div className="ai-focal-header">
        <h4>{focalPoint.displayName}</h4>
        <span style={{ backgroundColor: urgencyColors[focalPoint.urgency] }}>{focalPoint.urgency.toUpperCase()}</span>
      </div>
      <div className="ai-focal-stats">
        <span>{focalPoint.newsMentions} mentions</span>
        <span>{focalPoint.signalCount} signals</span>
        <span>Score {focalPoint.focalScore.toFixed(0)}</span>
      </div>
      <p>{focalPoint.narrative}</p>
      {focalPoint.correlationEvidence.length > 0 && (
        <ul>
          {focalPoint.correlationEvidence.map(item => <li key={item}>{item}</li>)}
        </ul>
      )}
      {focalPoint.topHeadlines[0] && (
        <a href={focalPoint.topHeadlines[0].url} target="_blank" rel="noopener noreferrer">
          {focalPoint.topHeadlines[0].title}
        </a>
      )}
    </div>
  );
}

function StoryCard({ story, rank }: { story: AnalyzedHeadline; rank: number }) {
  const scoreColor = story.finalScore > 0.7 ? '#ff4757' : story.finalScore > 0.4 ? '#ff9f43' : '#4a9eff';

  return (
    <div className={`ai-story-card ${story.flagged ? 'flagged' : ''}`}>
      <div className="ai-story-rank">#{rank}</div>
      <div className="ai-story-content">
        <h4>{story.title}</h4>
        <div className="ai-story-meta">
          <span style={{ color: scoreColor }}>Score {(story.finalScore * 100).toFixed(0)}</span>
          <span>Confidence {(story.confidence * 100).toFixed(0)}%</span>
          <span>Sources {story.sourceCount}</span>
        </div>
        {story.flagged && <div className="ai-flag">{story.flagReason}</div>}
        <div className="ai-perspectives">
          {story.perspectives.map(p => (
            <span key={p.name} title={p.reasoning}>{p.name}: {(p.score * 100).toFixed(0)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
