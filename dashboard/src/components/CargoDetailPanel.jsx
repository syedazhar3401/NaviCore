import React from 'react';
import { formatWeight } from '../utils/balanceEngine.js';

const TYPE_COLORS = {
  STANDARD: '#00d4ff',
  REFRIGERATED: '#00e676',
  HAZMAT: '#ff5252',
  LIQUID_BULK: '#f0b429',
};

const HAZARD_COLORS = {
  NONE: 'var(--text-secondary)',
  FLAMMABLE: '#ff9800',
  TOXIC: '#9c27b0',
  EXPLOSIVE: '#ff1744',
  CORROSIVE: '#795548',
};

const CargoDetailPanel = ({
  cargo,
  pendingPlacement,
  onEdit,
  onDelete,
  onRemoveFromSlot,
  onConfirmPlacement,
  onCancelPlacement,
}) => {
  if (!cargo) {
    return (
      <div style={{
        padding: '24px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
      }}>
        <p>Select a cargo item to view details</p>
      </div>
    );
  }

  const isPlaced = !!cargo.deckSlotId;
  const pendingForCargo = pendingPlacement?.cargoId === cargo.id ? pendingPlacement : null;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '16px'
      }}>
        <span style={{
          padding: '4px 8px',
          backgroundColor: TYPE_COLORS[cargo.type] || '#666',
          color: '#000',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
        }}>
          {cargo.type}
        </span>
        {cargo.hazardClass && cargo.hazardClass !== 'NONE' && (
          <span style={{
            padding: '4px 8px',
            backgroundColor: HAZARD_COLORS[cargo.hazardClass],
            color: '#fff',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}>
            {cargo.hazardClass}
          </span>
        )}
      </div>

      <h3 style={{ 
        color: 'white', 
        fontSize: '18px',
        marginBottom: '4px'
      }}>
        {cargo.label}
      </h3>
      <p style={{ 
        color: 'var(--cyan-glow)', 
        fontSize: '14px',
        marginBottom: '20px'
      }}>
        {cargo.cargoId}
      </p>

      <div style={{ display: 'grid', gap: '12px' }}>
        <DetailRow label="Contents" value={cargo.contents || '-'} />
        <DetailRow label="Weight" value={formatWeight(cargo.weightKg)} />
        <DetailRow label="Destination" value={cargo.destinationPort || '-'} />
        <DetailRow label="Owner" value={cargo.owner || '-'} />
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Status</span>
          <span style={{ 
            color: isPlaced ? '#00e676' : '#f0b429',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            {isPlaced ? '● LOADED' : '○ MANIFESTED'}
          </span>
        </div>

        {isPlaced && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Slot</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                color: 'var(--cyan-glow)', 
                fontSize: '13px',
                fontFamily: 'monospace'
              }}>
                {cargo.deckSlotId}
              </span>
              <button
                onClick={() => onRemoveFromSlot(cargo.id)}
                style={{
                  padding: '2px 6px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
                title="Remove from slot"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {pendingForCargo?.toSlotId && (
          <div style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.35)',
            borderRadius: '6px',
            display: 'grid',
            gap: '10px',
          }}>
            <div style={{ color: 'white', fontSize: '12px', lineHeight: 1.4 }}>
              Pending {pendingForCargo.mode === 'move' ? 'move' : 'placement'}:{' '}
              <span style={{ color: 'var(--cyan-glow)', fontFamily: 'monospace' }}>
                {pendingForCargo.fromSlotId || 'UNPLACED'} → {pendingForCargo.toSlotId}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onConfirmPlacement}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: 'var(--cyan-glow)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Confirm
              </button>
              <button
                onClick={onCancelPlacement}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.35)',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {cargo.notes && (
          <div style={{ 
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '6px',
          }}>
            <span style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '11px',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '4px'
            }}>
              Notes
            </span>
            <span style={{ color: 'white', fontSize: '13px' }}>
              {cargo.notes}
            </span>
          </div>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginTop: '24px'
      }}>
        <button
          onClick={() => onEdit(cargo)}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: 'rgba(0,212,255,0.2)',
            border: '1px solid var(--cyan-glow)',
            borderRadius: '6px',
            color: 'var(--cyan-glow)',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(cargo.id)}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: 'rgba(255,82,82,0.2)',
            border: '1px solid #ff5252',
            borderRadius: '6px',
            color: '#ff5252',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</span>
    <span style={{ color: 'white', fontSize: '13px' }}>{value}</span>
  </div>
);

export default CargoDetailPanel;
