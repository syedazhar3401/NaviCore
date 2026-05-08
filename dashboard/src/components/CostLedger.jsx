const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US')

const ZONE_COLORS = {
  'Bridge': 'var(--cyan-glow)',
  'Engine Room': 'var(--amber-warn)',
  'Port Deck': 'var(--green-signal)',
  'Cargo Hold': 'var(--gold)',
  'Starboard Deck': 'var(--cyan-glow)',
}

export default function CostLedger({
  fuelCostAccrued,
  crewPayrollAccrued,
  portFees,
  totalVoyageCost,
  fuelConsumed,
  fuelRemaining,
  fuelPricePerTonne,
  projectedFuelCost,
  estimatedFinalFuelCost,
  crewCount,
  crewRoster,
  distanceTraveled,
  remainingDistance,
  totalRouteNm,
  voyageDays,
  isOutOfFuel,
}) {
  const fuelPct = totalVoyageCost > 0 ? (fuelCostAccrued / totalVoyageCost) * 100 : 0
  const payrollPct = totalVoyageCost > 0 ? (crewPayrollAccrued / totalVoyageCost) * 100 : 0
  const portPct = totalVoyageCost > 0 ? (portFees / totalVoyageCost) * 100 : 0
  const progressPct = totalRouteNm > 0 ? Math.min((distanceTraveled / totalRouteNm) * 100, 100) : 0

  // Crew zone breakdown
  const zoneBreakdown = crewRoster.reduce((acc, c) => {
    if (!acc[c.zone]) acc[c.zone] = { count: 0, totalDaily: 0 }
    acc[c.zone].count += 1
    acc[c.zone].totalDaily += c.dailyRate
    return acc
  }, {})

  const dailyCrewCost = crewRoster.reduce((s, c) => s + c.dailyRate, 0)
  const payrollForecast = dailyCrewCost * (remainingDistance / (distanceTraveled / voyageDays || 1))

  // Cost split data for bar chart
  const costSplitData = [
    { label: 'Fuel', value: fuelPct, color: '#6366f1' },
    { label: 'Port', value: portPct, color: '#22d3ee' },
    { label: 'Payroll', value: payrollPct, color: '#34d399' },
  ]

  // Circular progress calculation
  const circumference = 2 * Math.PI * 40 // radius 40
  const strokeDashoffset = circumference - (progressPct / 100) * circumference

  return (
    <div className="cl-container">
      {isOutOfFuel && (
        <div className="cl-alert">
          <span className="dot dot-red pulse"></span>
          COSTS FROZEN — Vessel stranded. Fuel cost accrual halted. Crew payroll continues.
        </div>
      )}

      {/* Top Stats Row - 4 cards */}
      <div className="cl-top-row">
        <div className="cl-stat-card">
          <div className="cl-stat-label">TOTAL VOYAGE COST</div>
          <div className="cl-stat-value cl-gold">{fmt(totalVoyageCost)}</div>
          <div className="cl-stat-meta">Day {Math.floor(voyageDays) + 1} · {Math.round(distanceTraveled).toLocaleString()} / {Math.round(totalRouteNm).toLocaleString()} NM · Accruing live</div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-label">FUEL CONSUMED</div>
          <div className="cl-stat-value">{fuelConsumed.toFixed(1)} T</div>
          <div className="cl-stat-meta">{fuelPct.toFixed(0)}% of fuel spend</div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-label">FUEL REMAINING</div>
          <div className={`cl-stat-value ${fuelRemaining < 50 ? 'cl-red' : fuelRemaining < 100 ? 'cl-amber' : 'cl-green'}`}>
            {fuelRemaining.toFixed(1)} T
          </div>
          <div className="cl-stat-meta">Route buffer preserved</div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-label">PRICE / TONNE</div>
          <div className="cl-stat-value">${fuelPricePerTonne}</div>
          <div className="cl-stat-meta">Current bunker price</div>
        </div>
      </div>

      {/* Cost Split & Voyage Progress Row */}
      <div className="cl-progress-row">
        {/* Cost Split - Bar Chart Style */}
        <div className="cl-progress-card cl-cost-split-card">
          <div className="cl-card-title">COST SPLIT</div>
          <div className="cl-split-labels">
            Fuel {fuelPct.toFixed(0)}% · Port Fees {portPct.toFixed(0)}% · Payroll {payrollPct.toFixed(0)}%
          </div>
          <div className="cl-bar-chart">
            {costSplitData.map((item, i) => (
              <div key={i} className="cl-bar-item">
                <div className="cl-bar-track">
                  <div
                    className="cl-bar-fill"
                    style={{
                      height: `${Math.max(item.value, 5)}%`,
                      background: item.color
                    }}
                  ></div>
                </div>
                <div className="cl-bar-label">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="cl-bar-legend">
            <span><span className="cl-legend-dot" style={{ background: '#6366f1' }}></span> Fuel</span>
            <span><span className="cl-legend-dot" style={{ background: '#22d3ee' }}></span> Port</span>
            <span><span className="cl-legend-dot" style={{ background: '#34d399' }}></span> Payroll</span>
          </div>
        </div>

        {/* Voyage Progress - Circular Ring */}
        <div className="cl-progress-card cl-ring-card">
          <div className="cl-ring-header">
            <div className="cl-card-title">VOYAGE PROGRESS</div>
            <div className="cl-progress-text">{progressPct.toFixed(1)}% complete</div>
          </div>
          <div className="cl-ring-container">
            <svg className="cl-ring-svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              {/* Background ring */}
              <circle
                className="cl-ring-bg"
                cx="50"
                cy="50"
                r="40"
              />
              {/* Progress ring */}
              <circle
                className="cl-ring-progress"
                cx="50"
                cy="50"
                r="40"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset
                }}
              />
            </svg>
            <div className="cl-ring-value">{Math.round(progressPct)}</div>
          </div>
        </div>
      </div>

      {/* Fuel Section Row */}
      <div className="cl-fuel-row">
        {/* Fuel Costs */}
        <div className="cl-fuel-panel">
          <div className="cl-panel-header">
            <div>
              <div className="cl-panel-title">Fuel Costs</div>
              <div className="cl-panel-subtitle">Running fuel cost, remaining forecast, and final estimate.</div>
            </div>
            <div className="cl-badges">
              <span className="cl-badge cl-badge--live">Live</span>
              <span className="cl-badge">Updated 5s</span>
            </div>
          </div>
          <div className="cl-fuel-cards">
            <div className="cl-mini-card">
              <div className="cl-mini-label">FUEL CONSUMED</div>
              <div className="cl-mini-value cl-cyan">{fuelConsumed.toFixed(1)} T</div>
            </div>
            <div className="cl-mini-card">
              <div className="cl-mini-label">FUEL REMAINING</div>
              <div className={`cl-mini-value ${fuelRemaining < 50 ? 'cl-red' : fuelRemaining < 100 ? 'cl-amber' : 'cl-green'}`}>
                {fuelRemaining.toFixed(1)} T
              </div>
            </div>
            <div className="cl-mini-card">
              <div className="cl-mini-label">ACCRUED FUEL COST</div>
              <div className="cl-mini-value cl-cyan">{fmt(fuelCostAccrued)}</div>
            </div>
          </div>
        </div>

        {/* Fuel Cost Forecast */}
        <div className="cl-fuel-panel">
          <div className="cl-panel-header">
            <div className="cl-panel-title">Fuel Cost Forecast</div>
            <div className="cl-panel-subtitle">Projected remaining burn based on current consumption.</div>
          </div>
          <div className="cl-fuel-cards">
            <div className="cl-mini-card">
              <div className="cl-mini-label">ACCRUED</div>
              <div className="cl-mini-value cl-cyan">{fmt(fuelCostAccrued)}</div>
            </div>
            <div className="cl-mini-card">
              <div className="cl-mini-label">PROJECTED REMAINING</div>
              <div className="cl-mini-value cl-amber">{fmt(projectedFuelCost)}</div>
            </div>
            <div className="cl-mini-card">
              <div className="cl-mini-label">EST. FINAL FUEL COST</div>
              <div className="cl-mini-value cl-gold">{fmt(estimatedFinalFuelCost)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Crew & Port Fees Only */}
      <div className="cl-bottom-row cl-bottom-row--two">
        {/* Crew Payroll */}
        <div className="cl-bottom-panel">
          <div className="cl-panel-title cl-panel-title--upper">CREW PAYROLL</div>
          <div className="cl-grid-2x2">
            <div className="cl-grid-cell">
              <div className="cl-grid-label">PAYROLL ACCRUED</div>
              <div className="cl-grid-value cl-green">{fmt(crewPayrollAccrued)}</div>
            </div>
            <div className="cl-grid-cell">
              <div className="cl-grid-label">DAILY CREW COST</div>
              <div className="cl-grid-value">{fmt(dailyCrewCost)}</div>
            </div>
            <div className="cl-grid-cell">
              <div className="cl-grid-label">CREW COUNT</div>
              <div className="cl-grid-value">{crewCount} Crew</div>
            </div>
            <div className="cl-grid-cell">
              <div className="cl-grid-label">PAYROLL FORECAST</div>
              <div className="cl-grid-value">{fmt(payrollForecast)}</div>
            </div>
          </div>
        </div>

        {/* Port & Route Fees */}
        <div className="cl-bottom-panel">
          <div className="cl-panel-title cl-panel-title--upper">PORT & ROUTE FEES</div>
          <div className="cl-grid-2x2">
            <div className="cl-grid-cell">
              <div className="cl-grid-label">PORT FEES ACCRUED</div>
              <div className="cl-grid-value cl-amber">{fmt(portFees)}</div>
            </div>
            <div className="cl-grid-cell">
              <div className="cl-grid-label">HARBOR SERVICES</div>
              <div className="cl-grid-value">{fmt(portFees * 0.17)}</div>
            </div>
            <div className="cl-grid-cell">
              <div className="cl-grid-label">PILOTAGE</div>
              <div className="cl-grid-value">{fmt(portFees * 0.07)}</div>
            </div>
            <div className="cl-grid-cell">
              <div className="cl-grid-label">ETA BUFFER</div>
              <div className="cl-grid-value">{(remainingDistance / 450).toFixed(1)} days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
