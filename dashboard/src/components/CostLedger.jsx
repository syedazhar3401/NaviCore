import { useState, useEffect } from 'react'

const BASE_COSTS = {
  fuel: 42800,
  portFees: 15000,
  crewPayroll: 18200,
}

export default function CostLedger() {
  const [costs, setCosts] = useState(BASE_COSTS)
  const [elapsed, setElapsed] = useState(0)

  // Simulate live cost accumulation
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(e => e + 1)
      setCosts(prev => ({
        fuel: prev.fuel + 12, // ~$12 per tick
        portFees: prev.portFees,
        crewPayroll: prev.crewPayroll + 2,
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const total = costs.fuel + costs.portFees + costs.crewPayroll
  const fuelPct = (costs.fuel / total) * 100
  const portPct = (costs.portFees / total) * 100
  const payrollPct = (costs.crewPayroll / total) * 100

  const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0 })

  const ENTRIES = [
    { label: 'Marine Fuel (HFO)', category: 'Fuel', amount: costs.fuel, icon: '⛽', pct: fuelPct, color: 'var(--cyan-glow)' },
    { label: 'Port of Singapore Entry Fee', category: 'Port Fees', amount: costs.portFees, icon: '🏭', pct: portPct, color: 'var(--gold)' },
    { label: 'Crew Watch Payroll', category: 'Payroll', amount: costs.crewPayroll, icon: '👥', pct: payrollPct, color: 'var(--green-signal)' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Voyage Cost Ledger</h1>
          <p className="page-subtitle">Live running total — NaviCore One · Singapore → Rotterdam</p>
        </div>
        <span className="badge badge-gold">Live Accruing</span>
      </div>

      {/* Total */}
      <div className="card" style={{ padding: 28, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(240,180,41,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="stat-label">Total Voyage Cost</div>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: 48, fontWeight: 800, color: 'var(--gold)', marginTop: 8, letterSpacing: -1 }}>
          {fmt(total)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          Voyage day {Math.floor(elapsed / 30) + 1} · Accruing in real time
        </div>

        {/* Stacked bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', gap: 2 }}>
            <div style={{ width: `${fuelPct}%`, background: 'var(--cyan-glow)', borderRadius: '4px 0 0 4px', transition: 'width 0.5s' }} />
            <div style={{ width: `${portPct}%`, background: 'var(--gold)', transition: 'width 0.5s' }} />
            <div style={{ width: `${payrollPct}%`, background: 'var(--green-signal)', borderRadius: '0 4px 4px 0', transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span><span style={{ color: 'var(--cyan-glow)' }}>●</span> Fuel {fuelPct.toFixed(0)}%</span>
            <span><span style={{ color: 'var(--gold)' }}>●</span> Port Fees {portPct.toFixed(0)}%</span>
            <span><span style={{ color: 'var(--green-signal)' }}>●</span> Payroll {payrollPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>💳 Cost Breakdown</div>
        {ENTRIES.map((e, i) => (
          <div key={e.label} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
            borderBottom: i < ENTRIES.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontSize: 24 }}>{e.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{e.category}</div>
              <div style={{ marginTop: 8, height: 4, background: 'var(--navy-700)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${e.pct}%`, background: e.color, borderRadius: 2, transition: 'width 0.5s' }} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, color: e.color }}>{fmt(e.amount)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.pct.toFixed(1)}% of total</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
