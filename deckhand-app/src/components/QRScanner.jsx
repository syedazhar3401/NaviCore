import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const BACKEND_URL = 'http://localhost:4000'

const MOCK_MANIFEST = {
  'QR-CA-001': { contents: 'Electronics', weightKg: 12500, owner: 'TechCorp', destinationPort: 'Port of Rotterdam' },
  'QR-CA-002': { contents: 'Textiles', weightKg: 8000, owner: 'GlobalFabrics', destinationPort: 'Port of Rotterdam' },
  'QR-CA-003': { contents: 'Machinery', weightKg: 15000, owner: 'HeavyInd', destinationPort: 'Port of Rotterdam' },
}

const STATUS_OPTIONS = ['LOADED', 'SECURED', 'OFFLOADED', 'DAMAGED']

export default function QRScanner({ showToast }) {
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState('LOADED')
  const [submitting, setSubmitting] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)

  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startScanner = async () => {
    setScanning(true)
    setScanned(null)
    setTimeout(async () => {
      try {
        const qr = new Html5Qrcode('qr-reader')
        html5QrRef.current = qr
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            qr.stop()
            setScanning(false)
            handleScannedCode(text)
          },
          () => {}
        )
      } catch (err) {
        console.error(err)
        setScanning(false)
        showToast('Camera not available. Use manual entry.', true)
      }
    }, 100)
  }

  const stopScanner = () => {
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {})
    }
    setScanning(false)
  }

  const handleScannedCode = (code) => {
    const manifest = MOCK_MANIFEST[code]
    setScanned({ qrCode: code, manifest: manifest || null, found: !!manifest })
  }

  const handleManualEntry = () => {
    if (!manualCode.trim()) return
    handleScannedCode(manualCode.trim().toUpperCase())
    setManualCode('')
  }

  const submitUpdate = async () => {
    if (!scanned) return
    setSubmitting(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/cargo/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: scanned.qrCode, status: selectedStatus })
      })
      if (res.ok) {
        showToast(`${scanned.qrCode} updated → ${selectedStatus}`)
        setScanned(null)
      } else {
        showToast('Update failed — server error', true)
      }
    } catch {
      showToast('Cannot reach backend', true)
    }
    setSubmitting(false)
  }

  const BADGE_MAP = {
    LOADED: 'badge-green', SECURED: 'badge-cyan', OFFLOADED: 'badge-gold', DAMAGED: 'badge-red'
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20 }}>QR Scanner</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Scan a crate QR code to pull its manifest</p>
      </div>

      {/* Scanner viewport */}
      {!scanned && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="qr-viewport" style={{ minHeight: scanning ? 280 : 200 }}>
            {scanning ? (
              <>
                <div id="qr-reader" style={{ width: '100%' }} ref={scannerRef}></div>
                <div className="qr-corner tl"></div>
                <div className="qr-corner tr"></div>
                <div className="qr-corner bl"></div>
                <div className="qr-corner br"></div>
                <div className="qr-scan-line"></div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>📷</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Camera Ready</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Tap "Start Scanner" to activate</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            {!scanning
              ? <button className="btn btn-primary" onClick={startScanner}>📷 Start Scanner</button>
              : <button className="btn btn-outline" onClick={stopScanner} style={{ color: 'var(--red-alert)', borderColor: 'rgba(255,61,61,0.3)' }}>◼ Stop Camera</button>
            }
          </div>
        </div>
      )}

      {/* Manual entry */}
      {!scanned && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Manual Entry</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="e.g. QR-CA-001" value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualEntry()} />
            <button onClick={handleManualEntry} style={{ padding: '14px 18px', background: 'var(--navy-700)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--cyan-glow)', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Look up
            </button>
          </div>
        </div>
      )}

      {/* Manifest result */}
      {scanned && (
        <div className="card fade-in" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div className="card-header">
            {scanned.found ? '📦 Crate Found' : '⚠️ Unknown QR Code'}
            <span className={`badge ${scanned.found ? 'badge-green' : 'badge-red'}`} style={{ marginLeft: 'auto' }}>
              {scanned.qrCode}
            </span>
          </div>

          {scanned.found ? (
            <div className="manifest-card">
              <div className="manifest-field">
                <div className="manifest-label">Contents</div>
                <div className="manifest-value">{scanned.manifest.contents}</div>
              </div>
              <div className="manifest-field">
                <div className="manifest-label">Weight</div>
                <div className="manifest-value">{scanned.manifest.weightKg.toLocaleString()} kg</div>
              </div>
              <div className="manifest-field">
                <div className="manifest-label">Owner</div>
                <div className="manifest-value">{scanned.manifest.owner}</div>
              </div>
              <div className="manifest-field">
                <div className="manifest-label">Destination</div>
                <div className="manifest-value">{scanned.manifest.destinationPort}</div>
              </div>

              {/* Status picker */}
              <div style={{ marginTop: 20, marginBottom: 16 }}>
                <div className="manifest-label" style={{ marginBottom: 8 }}>Update Status</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} onClick={() => setSelectedStatus(s)}
                      className={`badge ${BADGE_MAP[s]}`}
                      style={{ cursor: 'pointer', padding: '8px 16px', fontSize: 12, border: selectedStatus === s ? '2px solid currentColor' : '1px solid rgba(255,255,255,0.2)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-success" onClick={submitUpdate} disabled={submitting}>
                {submitting ? '⏳ Sending…' : '📡 Update & Notify Dashboard'}
              </button>
            </div>
          ) : (
            <div style={{ padding: 20 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>QR code not found in manifest. Check the code and try again.</p>
            </div>
          )}

          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-outline" style={{ padding: '12px' }} onClick={() => setScanned(null)}>
              ← Scan Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
