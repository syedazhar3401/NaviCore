import { useState } from 'react'

const DEST_COLORS = ['#00d4ff', '#00e676', '#f0b429', '#ff9800', '#b388ff']

const DEFAULT_ITEMS = [
  { contents: 'Electronics', weightKg: 12500, destinationPort: 'Rotterdam' },
  { contents: 'Textiles', weightKg: 8000, destinationPort: 'Rotterdam' },
  { contents: 'Machinery', weightKg: 15000, destinationPort: 'Rotterdam' },
]

export default function CargoOptimizer({ backendUrl }) {
  const [items, setItems] = useState(DEFAULT_ITEMS)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [newItem, setNewItem] = useState({ contents: '', weightKg: '', destinationPort: '' })
  const [error, setError] = useState(null)

  const addItem = () => {
    if (!newItem.contents || !newItem.weightKg || !newItem.destinationPort) return
    setItems(prev => [...prev, { ...newItem, weightKg: Number(newItem.weightKg) }])
    setNewItem({ contents: '', weightKg: '', destinationPort: '' })
  }

  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const runOptimizer = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${backendUrl}/api/cargo/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setResult(data.layout);
      } else {
        setError(data.error || 'Optimization failed');
      }
    } catch (e) {
      setError('Could not connect to backend optimization service');
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">AI Cargo Optimizer</h1>
          <p className="page-subtitle">2D bin-packing with LIFO port sequencing & balance check</p>
        </div>
        <span className="badge badge-cyan">FFD Algorithm</span>
      </div>

      <div className="optimizer-layout">
        {/* Input panel */}
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📦</span> Cargo Manifest
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--navy-800)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.contents}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.weightKg.toLocaleString()} kg → {item.destinationPort}</div>
                  </div>
                  <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: 'var(--red-alert)', cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--navy-800)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>ADD ITEM</div>
              <input className="input" placeholder="Contents (e.g. Steel Coils)" style={{ marginBottom: 8 }}
                value={newItem.contents} onChange={e => setNewItem(p => ({ ...p, contents: e.target.value }))} />
              <input className="input" placeholder="Weight (kg)" type="number" style={{ marginBottom: 8 }}
                value={newItem.weightKg} onChange={e => setNewItem(p => ({ ...p, weightKg: e.target.value }))} />
              <input className="input" placeholder="Destination Port" style={{ marginBottom: 12 }}
                value={newItem.destinationPort} onChange={e => setNewItem(p => ({ ...p, destinationPort: e.target.value }))} />
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={addItem}>+ Add to Manifest</button>
            </div>
          </div>

          <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 14 }}
            onClick={runOptimizer} disabled={loading || items.length === 0}>
            {loading ? '⏳ Optimizing…' : '🧠 Run Optimization'}
          </button>
          
          {error && (
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,61,61,0.1)', border: '1px solid var(--red-alert)', borderRadius: 8, color: 'var(--red-alert)', fontSize: 13, textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Output grid */}
        <div>
          {!result ? (
            <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 48 }}>🗂️</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Awaiting Optimization</div>
              <div style={{ fontSize: 13, maxWidth: 300 }}>Add cargo items and click "Run Optimization" to see the 2D hold layout.</div>
            </div>
          ) : (
            <div>
              {/* Balance indicator */}
              <div className={`card ${result.isBalanced ? '' : ''}`} style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, border: `1px solid ${result.isBalanced ? 'rgba(0,230,118,0.3)' : 'rgba(255,61,61,0.3)'}` }}>
                <div style={{ fontSize: 28 }}>{result.isBalanced ? '⚖️' : '⚠️'}</div>
                <div>
                  <div style={{ fontWeight: 700, color: result.isBalanced ? 'var(--green-signal)' : 'var(--red-alert)' }}>
                    {result.isBalanced ? 'Load Balanced ✓' : 'Imbalance Detected!'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Port/starboard variance: {result.imbalance.toLocaleString()} kg</div>
                </div>
              </div>

              {/* Vessel hold diagram */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>📐 Hold Layout — Top View</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Color = Port Destination · Number = Load Order (1 = first on, last off)</div>

                {/* Port/Starboard labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                  <span>◀ PORT</span>
                  <span>BOW ▲</span>
                  <span>STARBOARD ▶</span>
                </div>

                <div style={{ background: 'var(--navy-700)', borderRadius: 12, padding: 16, border: '2px solid var(--border)' }}>
                  <div className="hold-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                    {result.grid.flatMap((row, ri) =>
                      row.map((cell, ci) => (
                        <div key={`${ri}-${ci}`} className="hold-cell" style={{
                          background: cell ? cell.color : 'rgba(255,255,255,0.04)',
                          opacity: cell ? 1 : 0.3,
                          minHeight: 64
                        }}>
                          {cell && (
                            <div style={{ textAlign: 'center', padding: 4 }}>
                              <div style={{ fontSize: 16, fontWeight: 800 }}>#{cell.loadOrder}</div>
                              <div style={{ fontSize: 9, opacity: 0.8 }}>{cell.contents.slice(0, 8)}</div>
                              <div style={{ fontSize: 9, opacity: 0.7 }}>{(cell.weightKg / 1000).toFixed(0)}t</div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                  {result.destinations.map((dest, i) => (
                    <div key={dest} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: DEST_COLORS[i % DEST_COLORS.length] }} />
                      {dest}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
