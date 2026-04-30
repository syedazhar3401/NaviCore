import { Anchor, Fuel, Map, Package, Radio, Users, Wallet, Waves } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'fleet', icon: Map, label: 'Fleet Map' },
  { id: 'arrangement', icon: Package, label: 'Cargo Arrangement' },
  { id: 'voyage', icon: Anchor, label: 'Voyage Overview' },
  { id: 'weather', icon: Waves, label: 'Weather & Risk' },
  { id: 'fuel', icon: Fuel, label: 'Fuel Stop Optimizer' },
  { id: 'cost', icon: Wallet, label: 'Cost Ledger' },
  { id: 'feed', icon: Radio, label: 'Loading Feed' },
  { id: 'crew', icon: Users, label: 'Crew Roster' },
]

export default function TopDock({ activeView, onNavigate, feedEvents = [] }) {
  return (
    <nav className="top-dock" aria-label="Primary navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeView === item.id
        const showBadge = item.id === 'feed' && feedEvents.length > 0

        return (
          <div className="top-dock-item-wrap" key={item.id}>
            <button
              type="button"
              className={`top-dock-item ${isActive ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
              {showBadge && <span className="top-dock-badge">{feedEvents.length}</span>}
            </button>
            <span className="top-dock-tooltip">{item.label}</span>
          </div>
        )
      })}
    </nav>
  )
}
