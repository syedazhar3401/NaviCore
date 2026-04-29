import React from 'react';
import { Package, Cpu } from 'lucide-react';

const TYPE_COLORS = {
  STANDARD: '#00d4ff',
  REFRIGERATED: '#00e676',
  HAZMAT: '#ff5252',
  LIQUID_BULK: '#f0b429',
};

const CargoManifestPanel = ({ 
  cargo, 
  selectedCargoId, 
  onSelectCargo, 
  onAddCargo, 
  onAIOptimize,
  isOptimizing 
}) => {
  const placedCargo = cargo.filter(c => c.deckSlotId);
  const unplacedCargo = cargo.filter(c => !c.deckSlotId);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <h3 style={{ 
          color: 'white', 
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '12px'
        }}>
          Manifest
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onAddCargo}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              backgroundColor: 'var(--cyan-glow)',
              border: 'none',
              borderRadius: '6px',
              color: '#000',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            <Package size={16} />
            Add Cargo
          </button>
          <button
            onClick={onAIOptimize}
            disabled={isOptimizing || unplacedCargo.length === 0}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              backgroundColor: isOptimizing || unplacedCargo.length === 0 
                ? 'rgba(255,255,255,0.1)' 
                : 'rgba(156,39,176,0.3)',
              border: `1px solid ${isOptimizing || unplacedCargo.length === 0 
                ? 'rgba(255,255,255,0.2)' 
                : '#9c27b0'}`,
              borderRadius: '6px',
              color: isOptimizing || unplacedCargo.length === 0 
                ? 'var(--text-secondary)' 
                : '#e1bee7',
              cursor: isOptimizing || unplacedCargo.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            <Cpu size={16} />
            {isOptimizing ? 'Optimizing...' : 'AI Optimize'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'flex',
        padding: '12px 20px',
        gap: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <Stat label="Placed" value={placedCargo.length} color="#00e676" />
        <Stat label="Unplaced" value={unplacedCargo.length} color="#f0b429" />
        <Stat label="Total" value={cargo.length} color="white" />
      </div>

      {/* Cargo Lists */}
      <div style={{ 
        flex: 1,
        overflow: 'auto',
        padding: '12px',
      }}>
        {/* Placed Cargo */}
        {placedCargo.length > 0 && (
          <>
            <div style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
              marginLeft: '8px'
            }}>
              On Deck
            </div>
            {placedCargo.map(c => (
              <CargoItem 
                key={c.id} 
                cargo={c} 
                isSelected={selectedCargoId === c.id}
                onClick={() => onSelectCargo(c.id)}
                isPlaced={true}
              />
            ))}
          </>
        )}

        {/* Unplaced Cargo */}
        {unplacedCargo.length > 0 && (
          <>
            <div style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: placedCargo.length > 0 ? '16px' : '0',
              marginBottom: '8px',
              marginLeft: '8px'
            }}>
              Waiting to Load
            </div>
            {unplacedCargo.map(c => (
              <CargoItem 
                key={c.id} 
                cargo={c} 
                isSelected={selectedCargoId === c.id}
                onClick={() => onSelectCargo(c.id)}
                isPlaced={false}
              />
            ))}
          </>
        )}

        {cargo.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: 'var(--text-secondary)'
          }}>
            <Package size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p style={{ fontSize: '13px' }}>No cargo in manifest</p>
            <p style={{ fontSize: '11px', marginTop: '4px' }}>Click "Add Cargo" to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, color }) => (
  <div>
    <div style={{ 
      color, 
      fontSize: '18px', 
      fontWeight: 'bold',
      fontFamily: 'monospace'
    }}>
      {value}
    </div>
    <div style={{ 
      color: 'var(--text-secondary)', 
      fontSize: '10px',
      textTransform: 'uppercase'
    }}>
      {label}
    </div>
  </div>
);

const CargoItem = ({ cargo, isSelected, onClick, isPlaced }) => (
  <div
    onClick={onClick}
    style={{
      padding: '12px',
      marginBottom: '6px',
      backgroundColor: isSelected ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isSelected ? 'var(--cyan-glow)' : 'transparent'}`,
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
  >
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      marginBottom: '4px'
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: TYPE_COLORS[cargo.type] || '#666',
      }} />
      <span style={{
        fontSize: '11px',
        color: 'var(--text-secondary)',
        fontFamily: 'monospace'
      }}>
        {cargo.cargoId}
      </span>
      {isPlaced && (
        <span style={{
          marginLeft: 'auto',
          fontSize: '10px',
          color: '#00e676',
          fontFamily: 'monospace'
        }}>
          {cargo.deckSlotId}
        </span>
      )}
    </div>
    <div style={{ 
      color: 'white', 
      fontSize: '13px',
      fontWeight: isSelected ? 'bold' : 'normal',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}>
      {cargo.label}
    </div>
    <div style={{ 
      color: 'var(--text-secondary)', 
      fontSize: '11px',
      marginTop: '2px'
    }}>
      {(cargo.weightKg / 1000).toFixed(1)}t
    </div>
  </div>
);

export default CargoManifestPanel;
