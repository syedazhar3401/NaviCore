const STATUS_LABELS = {
  LOADED: 'LOADED',
  SECURED: 'SECURED',
  MANIFESTED: 'MANIFESTED',
  OFFLOADED: 'OFFLOADED',
  DAMAGED: 'DAMAGED',
}


const FUEL_CAPACITY = 1000
const DEFAULT_DEST_COORDS = { lat: 51.92, lng: 4.48 }

function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = v => (v * Math.PI) / 180
  const R = 3440.065
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function clamp01(v) {
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

export default function VoyageCard({
  vessels = [],
  fuelRemaining = 0,
  fuelConsumptionRate = 0.15,
  origin = 'Port of Singapore',
  destination = 'Port of Rotterdam',
  remainingDistanceNm = 0,
  vesselRoutePos,
  totalRouteNm = 8510,
  isOutOfFuel = false,
  destCoords = DEFAULT_DEST_COORDS,
  cargo = [],
}) {
  const vessel = vessels[0]

  const totalWeight = cargo.reduce((a, c) => a + c.weightKg, 0)
  const loadedCount = cargo.filter(c => ['LOADED', 'SECURED'].includes(c.loadStatus)).length

  const etaFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const targetCoords = Number.isFinite(destCoords?.lat) && Number.isFinite(destCoords?.lng)
    ? destCoords
    : DEFAULT_DEST_COORDS

  const distanceToPortNm = vessel && Number.isFinite(vessel.currentLat) && Number.isFinite(vessel.currentLng)
    ? haversineNm(vessel.currentLat, vessel.currentLng, targetCoords.lat, targetCoords.lng)
    : Math.max(remainingDistanceNm, 0)

  const routeTotalNm = totalRouteNm || (vesselRoutePos ? vesselRoutePos.distanceFromStart + vesselRoutePos.distanceToDestination : 8510)
  const progressByDistance = routeTotalNm > 0
    ? clamp01((routeTotalNm - Math.max(remainingDistanceNm, 0)) / routeTotalNm)
    : 0

  const journeyProgress = progressByDistance

  const startX = 40
  const startY = 140
  const controlX = 200
  const controlY = 30
  const endX = 360
  const endY = 40

  const getBezierPoint = (t) => ({
    x: Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endX,
    y: Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY,
  })

  const currentProgress = clamp01(journeyProgress)
  const mapCurrentPos = getBezierPoint(currentProgress)
  const mapTrailingPos = getBezierPoint(clamp01(currentProgress - 0.2))
  const mapLeadingPos = getBezierPoint(clamp01(currentProgress + 0.2))
  const isStranded = Boolean(isOutOfFuel || vessel?.status === 'STRANDED')

  const fuelPct = clamp01(fuelRemaining / FUEL_CAPACITY) * 100
  const routeRange = fuelConsumptionRate > 0 ? Math.round(fuelRemaining / fuelConsumptionRate) : 0

  const circumference = 2 * Math.PI * 36
  const strokeDashoffset = circumference - (fuelPct / 100) * circumference

  return (
    <div className="vo-container">
      <div className="vo-location-chip">
        Currently near: Port Said (Suez North)
      </div>

      <div className="vo-header-card">
        <div className="vo-header-grid">
          <div className="vo-header-item">
            <div className="vo-header-label">VESSEL</div>
            <div className="vo-header-value vo-cyan">{vessel?.name || 'NaviCore One'}</div>
          </div>
          <div className="vo-header-item">
            <div className="vo-header-label">ORIGIN</div>
            <div className="vo-header-value vo-white">
              <span className="vo-icon-location"></span>
              {origin}
            </div>
          </div>
          <div className="vo-header-item">
            <div className="vo-header-label">DESTINATION</div>
            <div className="vo-header-value vo-white">
              <span className="vo-icon-flag"></span>
              {destination}
            </div>
          </div>
          <div className="vo-header-item vo-header-item--distance">
            <div className="vo-header-label">DISTANCE TO DEST.</div>
            <div className="vo-header-value vo-cyan vo-header-value--distance">{Math.max(distanceToPortNm, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} NM</div>
          </div>
          <div className="vo-header-item">
            <div className="vo-header-label">ETA</div>
            <div className="vo-header-value vo-gold">{etaFormatted}</div>
          </div>
        </div>
      </div>

      <div className="vo-middle-row">
        <div className="vo-map-panel">
          <div className="vo-panel-title">VOYAGE MAP PREVIEW</div>
          <div className="vo-map-container">
            <svg className="vo-map-svg" viewBox="0 0 400 180">
              <path className={`vo-map-route ${isStranded ? 'vo-map-route--stranded' : ''}`} d="M 40 140 Q 200 30 360 40" />
              <circle className="vo-map-point vo-map-point--start" cx="40" cy="140" r="8" />
              <text className="vo-map-label" x="40" y="165" textAnchor="middle">Singapore</text>

              <circle className={`vo-map-point vo-map-point--current ${isStranded ? 'vo-map-point--stranded' : ''}`} cx={mapCurrentPos.x} cy={mapCurrentPos.y} r="10">
                <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
              </circle>

              <circle className={`vo-map-point vo-map-point--waypoint ${isStranded ? 'vo-map-point--waypoint-stranded' : ''}`} cx={mapTrailingPos.x} cy={mapTrailingPos.y} r="4" />
              <circle className={`vo-map-point vo-map-point--waypoint ${isStranded ? 'vo-map-point--waypoint-stranded' : ''}`} cx={mapLeadingPos.x} cy={mapLeadingPos.y} r="4" />
              <circle className="vo-map-point vo-map-point--end" cx="360" cy="40" r="8" />
              <text className="vo-map-label" x="360" y="25" textAnchor="middle">Rotterdam</text>
            </svg>
          </div>
        </div>

        <div className="vo-cargo-summary-panel">
          <div className="vo-panel-title">CARGO SUMMARY</div>
          <div className="vo-summary-grid">
            <div className="vo-summary-cell vo-summary-cell--progress">
              <div className="vo-summary-label">CARGO LOADED</div>
              <div className="vo-summary-progress-wrap">
                <div className="vo-summary-progress-meta">
                  <span>{loadedCount}/{cargo.length} items</span>
                  <span>{Math.round((loadedCount / cargo.length) * 100)}%</span>
                </div>
                <div className="vo-summary-progress-track">
                  <div className="vo-summary-progress-fill" style={{ width: `${(loadedCount / cargo.length) * 100}%` }}></div>
                </div>
              </div>
            </div>
            <div className="vo-summary-cell">
              <div className="vo-summary-label">TOTAL CARGO ITEMS</div>
              <div className="vo-summary-value vo-cyan">{cargo.length}</div>
            </div>
            <div className="vo-summary-cell">
              <div className="vo-summary-label">TOTAL WEIGHT</div>
              <div className="vo-summary-value vo-gold">{(totalWeight / 1000).toFixed(1)}t</div>
            </div>
            <div className="vo-summary-cell">
              <div className="vo-summary-label">ITEMS SECURED</div>
              <div className="vo-summary-value vo-green">{loadedCount}</div>
            </div>
          </div>
        </div>

        <div className="vo-fuel-status-panel">
          <div className="vo-panel-title">FUEL STATUS</div>
          <div className="vo-fuel-content">
            <div className="vo-fuel-gauge">
              <div className="vo-fuel-ring-container">
                <svg className="vo-fuel-ring-svg" viewBox="0 0 80 80">
                  <defs>
                    <linearGradient id="fuelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <circle className="vo-fuel-ring-bg" cx="40" cy="40" r="36" />
                  <circle
                    className="vo-fuel-ring-progress"
                    cx="40"
                    cy="40"
                    r="36"
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset,
                      transform: 'rotate(-90deg)',
                      transformOrigin: '40px 40px',
                    }}
                  />
                </svg>
                <div className="vo-fuel-ring-value">
                  {Number(fuelRemaining).toFixed(1)}<span className="vo-fuel-ring-unit">T</span>
                </div>
              </div>
              <div className="vo-fuel-ring-label">FUEL REMAINING</div>
            </div>

            <div className="vo-fuel-stats-compact">
              <div className="vo-fuel-stat-compact">
                <div className="vo-fuel-stat-label">CONSUMPTION RATE</div>
                <div className="vo-fuel-stat-value vo-gold">{fuelConsumptionRate}</div>
                <div className="vo-fuel-stat-sub">Tonnes / NM</div>
              </div>
              <div className="vo-fuel-stat-compact">
                <div className="vo-fuel-stat-label">ROUTE RANGE</div>
                <div className="vo-fuel-stat-value vo-green">{routeRange.toLocaleString()} NM</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="vo-manifest-section">
        <div className="vo-manifest-header-title">CARGO MANIFEST</div>

        <div className="vo-cargo-list-wrapper" style={{
          maxHeight: '320px',
          overflowY: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {cargo.map((c) => (
            <div key={c.id || c.qrCode || c.cargoId} className="vo-cargo-card">
              <div className="vo-cargo-left">
                <div className="vo-cargo-qr">{c.cargoId || c.qrCode}</div>
                <div className="vo-cargo-contents">{c.label || c.contents}</div>
              </div>
              <div className="vo-cargo-middle">
                <div className="vo-cargo-stat">
                  <div className="vo-cargo-stat-label">Owner</div>
                  <div className="vo-cargo-stat-value">{c.owner || 'Various'}</div>
                </div>
                <div className="vo-cargo-stat">
                  <div className="vo-cargo-stat-label">Weight</div>
                  <div className="vo-cargo-stat-value">{c.weightKg?.toLocaleString()} kg</div>
                </div>
                <div className="vo-cargo-stat">
                  <div className="vo-cargo-stat-label">Destination</div>
                  <div className="vo-cargo-stat-value">{(c.destinationPort || destination || '').replace('Port of ', '')}</div>
                </div>
              </div>
              <div className={`vo-cargo-status vo-cargo-status--${c.loadStatus?.toLowerCase() || 'manifested'}`}>
                {STATUS_LABELS[c.loadStatus] || c.loadStatus}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
