import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { NewsItem } from '@/types/news';
import { DISPLAY_CATEGORIES, fetchNews, formatTimeAgo, getTagColor, getSourceColor } from '@/services/news-aggregator';
import AIInsightsPanel from './AIInsightsPanel';

interface LiveIntelligenceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LiveIntelligence({ isOpen, onClose }: LiveIntelligenceProps) {
  const [newsByCategory, setNewsByCategory] = useState<Map<string, NewsItem[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRealData, setIsRealData] = useState(false);

  const loadNews = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchNews();
      setNewsByCategory(result.byCategory);
      setLastUpdated(new Date());
      setIsRealData(true);
    } catch (err) {
      console.error('[LiveIntelligence] Failed to load news:', err);
      setError(err instanceof Error ? err.message : 'Failed to load intelligence data');
      setIsRealData(false);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    loadNews();

    // Auto-refresh every 2 minutes
    const interval = setInterval(loadNews, 120000);
    return () => clearInterval(interval);
  }, [loadNews]);

  // Filter items based on active tab
  const filteredCategories = useMemo(() => {
    if (activeTab === 'all') return newsByCategory;

    const filtered = new Map<string, NewsItem[]>();
    newsByCategory.forEach((items, categoryId) => {
      const filteredItems = items.filter(item => {
        if (activeTab === 'cyber') {
          return item.threat?.category === 'cyber' ||
                 item.title.toLowerCase().includes('cyber') ||
                 item.title.toLowerCase().includes('hack');
        }
        if (activeTab === 'nuclear') {
          return item.threat?.category === 'conflict' &&
                 (item.title.toLowerCase().includes('nuclear') ||
                  item.title.toLowerCase().includes('missile'));
        }
        return true;
      });
      if (filteredItems.length > 0) {
        filtered.set(categoryId, filteredItems);
      }
    });
    return filtered;
  }, [newsByCategory, activeTab]);

  const totalCount = useMemo(() => {
    let count = 0;
    filteredCategories.forEach(items => count += items.length);
    return count;
  }, [filteredCategories]);

  if (!isOpen) return null;

  return createPortal(
    <div className="live-intelligence-panel">
      {/* Header */}
      <div className="li-header">
        <div className="li-header-left">
          <h2 className="li-title">LIVE INTELLIGENCE</h2>
          <span className="li-live-dot" />
          {lastUpdated && (
            <span className="li-updated">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
        </div>
        <div className="li-header-right">
          <span className="li-count">{totalCount}</span>
          <button className="li-close" onClick={onClose}>×</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="li-tabs">
        <button
          className={`li-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span className="li-tab-icon">✈️</span>
          Military Activity
        </button>
        <button
          className={`li-tab ${activeTab === 'cyber' ? 'active' : ''}`}
          onClick={() => setActiveTab('cyber')}
        >
          <span className="li-tab-icon">🔒</span>
          Cyber Threats
        </button>
        <button
          className={`li-tab ${activeTab === 'nuclear' ? 'active' : ''}`}
          onClick={() => setActiveTab('nuclear')}
        >
          <span className="li-tab-icon">☢️</span>
          Nuclear
        </button>

      </div>

      {/* Content */}
      <div className="li-content">
        {isLoading ? (
          <div className="li-loading">
            <div className="li-loading-spinner" />
            <p>Fetching live intelligence...</p>
            <span className="li-loading-sub">Connecting to ACLED API & RSS feeds</span>
          </div>
        ) : error ? (
          <div className="li-error">
            <div className="li-error-icon">⚠️</div>
            <h3>Unable to Load Live Data</h3>
            <p>{error}</p>
            <div className="li-error-help">
              <p>Make sure the backend server is running:</p>
              <code>cd backend && npm run dev</code>
            </div>
          </div>
        ) : (
          <div className="li-categories">
            {!isRealData && (
              <div className="li-demo-warning">
                <span>⚠️ Demo Mode - Using sample data</span>
              </div>
            )}
            {DISPLAY_CATEGORIES.map(category => {
              const items = filteredCategories.get(category.id) || [];
              if (items.length === 0) return null;

              return (
                <div key={category.id} className="li-category">
                  <div className="li-category-header">
                    <h3 className="li-category-name">{category.name}</h3>
                    <div className="li-category-badges">
                      <span className="li-badge li-badge-live">LIVE</span>
                      <button className="li-btn-icon">↓</button>
                      <button className="li-btn-icon">⚡</button>
                      <span className="li-count-badge">{items.length}</span>
                    </div>
                  </div>

                  <div className="li-articles">
                    {items.map(item => {
                      const articleUrl = item.link;
                      const threatLevel = item.threat?.level || 'info';
                      const threatColor = threatLevel === 'critical' ? '#ff3333' :
                                        threatLevel === 'high' ? '#ff8800' :
                                        threatLevel === 'medium' ? '#ffcc00' : '#888888';

                      return (
                      <a
                        key={item.id}
                        href={articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="li-article"
                        style={{ borderLeftColor: item.isAlert ? threatColor : 'transparent' }}
                      >
                        <div className="li-article-header">
                          <div className="li-article-source">
                            <span className="li-source-dot" style={{ background: getSourceColor(item.source) }} />
                            {item.source.toUpperCase()}
                            {item.isAlert && (
                              <span
                                className="li-tag"
                                style={{ background: threatColor, color: '#fff' }}
                              >
                                {threatLevel.toUpperCase()}
                              </span>
                            )}
                            {item.tags?.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className="li-tag"
                                style={{ background: getTagColor(tag), color: '#fff' }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className="li-article-time">{formatTimeAgo(item.pubDate)}</span>
                        </div>
                        <h4 className="li-article-title">{item.title}</h4>
                        {item.snippet && (
                          <p className="li-article-snippet">{item.snippet}</p>
                        )}
                        {item.locationName && (
                          <span className="li-location">📍 {item.locationName}</span>
                        )}
                      </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .live-intelligence-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 480px;
          height: 100vh;
          background: linear-gradient(180deg, rgba(8, 12, 20, 0.72) 0%, rgba(8, 12, 20, 0.66) 100%);
          backdrop-filter: blur(8px);
          border-left: 1px solid rgba(100, 200, 255, 0.25);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', 'Space Grotesk', sans-serif;
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.38);
        }

        .li-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(100, 200, 255, 0.15);
          background: rgba(0, 0, 0, 0.3);
        }

        .li-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .li-title {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: rgba(255, 255, 255, 0.9);
        }

        .li-live-dot {
          width: 8px;
          height: 8px;
          background: #00c864;
          border-radius: 50%;
          animation: pulse-live 1.5s ease-in-out infinite;
        }

        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .li-updated {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-left: 8px;
        }

        .li-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .li-count {
          background: rgba(100, 100, 100, 0.3);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
        }

        .li-close {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .li-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .li-tabs {
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(100, 200, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
        }

        .li-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .li-tab:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(100, 200, 255, 0.3);
        }

        .li-tab.active {
          background: rgba(100, 200, 255, 0.15);
          border-color: rgba(100, 200, 255, 0.4);
          color: white;
        }

        .li-tab-icon {
          font-size: 14px;
        }

        .li-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .li-loading {
          text-align: center;
          padding: 60px 40px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
        }

        .li-loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(100, 200, 255, 0.2);
          border-top-color: #64c8ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .li-loading p {
          margin: 0 0 8px 0;
          font-weight: 500;
        }

        .li-loading-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .li-error {
          text-align: center;
          padding: 60px 40px;
          color: rgba(255, 255, 255, 0.8);
        }

        .li-error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .li-error h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #ff6b6b;
        }

        .li-error p {
          margin: 0 0 20px 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .li-error-help {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 16px;
          text-align: left;
        }

        .li-error-help p {
          margin: 0 0 8px 0;
          font-size: 12px;
        }

        .li-error-help code {
          display: block;
          background: rgba(100, 200, 255, 0.1);
          padding: 10px 12px;
          border-radius: 4px;
          font-family: 'Fira Code', monospace;
          font-size: 12px;
          color: #64c8ff;
        }

        .li-demo-warning {
          background: rgba(255, 193, 7, 0.15);
          border: 1px solid rgba(255, 193, 7, 0.3);
          border-radius: 6px;
          padding: 10px 16px;
          margin-bottom: 16px;
          text-align: center;
        }

        .li-demo-warning span {
          font-size: 12px;
          color: #ffc107;
          font-weight: 500;
        }

        .li-categories {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .li-category {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .li-category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .li-category-name {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.9);
        }

        .li-category-badges {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .li-badge {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .li-badge-live {
          background: rgba(0, 200, 100, 0.2);
          color: #00c864;
          border: 1px solid rgba(0, 200, 100, 0.3);
        }

        .li-btn-icon {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }

        .li-btn-icon:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .li-count-badge {
          background: rgba(100, 100, 100, 0.3);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
        }

        .li-articles {
          padding: 8px;
        }

        .li-article {
          display: block;
          padding: 12px;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }

        .li-article:hover {
          background: rgba(255, 255, 255, 0.05);
          border-left-color: rgba(100, 200, 255, 0.5);
        }

        .li-article-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .li-article-source {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.5);
        }

        .li-source-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .li-tag {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .li-article-time {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .li-article-title {
          margin: 0 0 6px 0;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
          color: rgba(255, 255, 255, 0.95);
        }

        .li-article-snippet {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.6);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .li-location {
          display: inline-block;
          margin-top: 6px;
          padding: 2px 8px;
          background: rgba(100, 200, 255, 0.15);
          border-radius: 4px;
          font-size: 10px;
          color: rgba(100, 200, 255, 0.9);
          font-weight: 500;
        }

        /* Scrollbar styling */
        .li-content::-webkit-scrollbar {
          width: 6px;
        }

        .li-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .li-content::-webkit-scrollbar-thumb {
          background: rgba(100, 200, 255, 0.2);
          border-radius: 3px;
        }

        .li-content::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 200, 255, 0.4);
        }
      `}</style>
    </div>,
    document.body
  );
}
