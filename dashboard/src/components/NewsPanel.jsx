import { useState, useEffect } from 'react'

const BACKEND_URL = 'http://localhost:4000'

export default function NewsPanel({ vessels }) {
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (vessels?.length > 0 && !selectedVessel) {
      setSelectedVessel(vessels[0])
    }
  }, [vessels])

  // Update selected vessel from live data
  useEffect(() => {
    if (selectedVessel) {
      const updated = vessels?.find(v => v.id === selectedVessel.id)
      if (updated) setSelectedVessel(updated)
    }
  }, [vessels])

  const fetchNews = async (vessel = selectedVessel) => {
    if (!vessel) return
    setLoading(true)
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/news?lat=${vessel.currentLat}&lng=${vessel.currentLng}`
      )
      const data = await res.json()
      if (res.ok) {
        setNews(data)
      } else {
        console.error('News fetch error:', data.error)
      }
    } catch (err) {
      console.error('News fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on vessel selection
  useEffect(() => {
    if (selectedVessel) {
      fetchNews(selectedVessel)
    }
  }, [selectedVessel?.id])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh || !selectedVessel) return
    const timer = setInterval(() => fetchNews(), 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [autoRefresh, selectedVessel])

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const getSourceIcon = () => {
    if (!news) return '📡'
    if (news.source === 'live') return '🟢'
    if (news.degraded) return '🟡'
    return '🔵'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Maritime News Intel</h1>
          <p className="page-subtitle">Region-aware shipping & maritime news powered by AI zone mapping</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loading && (
            <span className="badge badge-cyan">
              <span className="spinner"></span> Fetching…
            </span>
          )}
          {news?.degraded && (
            <span className="badge badge-amber">⚠ Degraded Mode</span>
          )}
          <button className="btn btn-primary" onClick={() => fetchNews()} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="wr-vessel-selector">
        {vessels?.map(v => (
          <button
            key={v.id}
            className={`wr-vessel-chip ${selectedVessel?.id === v.id ? 'active' : ''}`}
            onClick={() => setSelectedVessel(v)}
          >
            <span className={`dot ${v.status === 'IN_TRANSIT' ? 'dot-cyan' : 'dot-gold'}`}></span>
            <span style={{ fontWeight: 600 }}>{v.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {v.currentLat?.toFixed(2)}°N, {v.currentLng?.toFixed(2)}°E
            </span>
          </button>
        ))}
      </div>

      <div className="wr-grid">
        <div className="wr-left">
          {/* Region Info Card */}
          <div className="card news-region-card">
            <div className="wr-card-header" style={{ padding: '16px 20px' }}>
              <span>🌐 Detected Region</span>
              <span style={{ fontSize: 18 }}>{getSourceIcon()}</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,212,255,0.05))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24
                }}>
                  🗺️
                </div>
                <div>
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 20, fontWeight: 700
                  }}>
                    {news?.region || 'Detecting…'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Nearest Port: {news?.nearestPort || '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="news-meta-item">
                  <span className="news-meta-label">Source</span>
                  <span className="news-meta-value" style={{
                    color: news?.source === 'live' ? 'var(--green-signal)' : 'var(--amber-warn)'
                  }}>
                    {news?.source === 'live' ? '● Live API' : news?.source === 'cache' ? '● Cached' : '○ None'}
                  </span>
                </div>
                <div className="news-meta-item">
                  <span className="news-meta-label">Articles</span>
                  <span className="news-meta-value">{news?.articles?.length || 0}</span>
                </div>
                <div className="news-meta-item">
                  <span className="news-meta-label">Fetched</span>
                  <span className="news-meta-value">
                    {news?.fetchedAt ? getTimeAgo(news.fetchedAt) : news?.cachedAt ? getTimeAgo(news.cachedAt) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-refresh toggle */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Auto-Refresh</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Fetch new articles every 5 minutes
                </div>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none',
                  background: autoRefresh ? 'var(--green-signal)' : 'var(--navy-700)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 9,
                  background: 'white', position: 'absolute', top: 3,
                  left: autoRefresh ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}></div>
              </button>
            </div>
          </div>
        </div>

        <div className="wr-right">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="wr-card-header">
              <span>📰 Latest Maritime News</span>
              {news?.degraded && (
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(240,180,41,0.12)', color: 'var(--amber-warn)',
                  fontWeight: 700, letterSpacing: 0.5
                }}>CACHED</span>
              )}
            </div>

            {news?.articles?.length > 0 ? (
              <div>
                {news.articles.map((article, idx) => (
                  <a
                    key={idx}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-article-item"
                    style={{
                      borderBottom: idx < news.articles.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="news-article-title">{article.title}</div>
                      {article.description && (
                        <div className="news-article-desc">
                          {article.description.length > 160
                            ? article.description.substring(0, 160) + '…'
                            : article.description}
                        </div>
                      )}
                      <div className="news-article-meta">
                        {article.source && <span className="news-source-tag">{article.source}</span>}
                        {article.pubDate && <span>{getTimeAgo(article.pubDate)}</span>}
                        {article.category?.length > 0 && (
                          <span style={{ color: 'var(--cyan-glow)' }}>
                            {article.category.slice(0, 2).join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {article.imageUrl && (
                      <div className="news-article-thumb">
                        <img
                          src={article.imageUrl}
                          alt=""
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      </div>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div className="wr-empty">
                <div style={{ fontSize: 32 }}>📰</div>
                <div>{loading ? 'Fetching news…' : 'No articles available for this region'}</div>
                {!loading && (
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Try selecting a different vessel or click Refresh
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
