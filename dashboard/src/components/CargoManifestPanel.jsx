import React from 'react';
import { Package, Cpu, RotateCcw, Plus } from 'lucide-react';

const TYPE_COLORS = {
  STANDARD: '#00d4ff',
  REFRIGERATED: '#00e676',
  HAZMAT: '#ff5252',
  LIQUID_BULK: '#f0b429',
};

const CargoManifestPanel = ({
  cargo,
  initialLayout,
  selectedCargoId,
  onSelectCargo,
  onAddCargo,
  onAIOptimize,
  onResetAllCargo,
  isOptimizing,
  isResetDisabled,
}) => {
  const manifestedCount = cargo.filter(c => c.deckSlotId).length;
  const totalCount = cargo.length;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h2 style={{
          margin: 0,
          color: 'white',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Package size={20} color="var(--cyan-glow)" />
          Manifest
        </h2>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          backgroundColor: 'rgba(255,255,255,0.05)',
          padding: '4px 8px',
          borderRadius: '12px',
        }}>
          {manifestedCount} / {totalCount}
        </span>
      </div>

      {/* Top Action Panel */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <button
          onClick={onAIOptimize}
          disabled={isOptimizing}
          style={{
            flex: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            backgroundColor: 'rgba(156, 39, 176, 0.2)',
            border: '1px solid #9c27b0',
            borderRadius: '6px',
            color: '#e1bee7',
            cursor: isOptimizing ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
          }}
        >
          <Cpu size={14} />
          {isOptimizing ? 'Optimizing...' : 'AI Arrange'}
        </button>
        
        <button
          onClick={onAddCargo}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid var(--cyan-glow)',
            borderRadius: '6px',
            color: 'var(--cyan-glow)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
          }}
        >
          <Plus size={14} />
          Add Extra
        </button>

        <button
          onClick={onResetAllCargo}
          disabled={isResetDisabled}
          style={{
            padding: '10px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            cursor: isResetDisabled ? 'not-allowed' : 'pointer',
          }}
          title="Reset all assignments"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingRight: '4px',
      }}>
        {cargo.map((item) => {
          const isSelected = selectedCargoId === item.id;
          const isPlaced = !!item.deckSlotId;
          const isPlanning = isPlaced && initialLayout?.[item.id] !== item.deckSlotId;

          return (
            <CargoItem
              key={item.id}
              cargo={item}
              isSelected={isSelected}
              isPlanning={isPlanning}
              onClick={() => onSelectCargo(item.id)}
            />
          );
        })}

        {cargo.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
          }}>
            No cargo items for this voyage.
          </div>
        )}
      </div>
    </div>
  );
};

const CargoItem = ({ cargo, isSelected, isPlanning, onClick }) => {
  const isPlaced = !!cargo.deckSlotId;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px',
        backgroundColor: isSelected ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isSelected ? 'var(--cyan-glow)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Type Indicator Bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        backgroundColor: TYPE_COLORS[cargo.type] || '#666',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '4px' 
        }}>
          <span style={{
            color: 'white',
            fontSize: '13px',
            fontWeight: isSelected ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {cargo.label}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {isPlanning && (
              <span style={{
                fontSize: '8px',
                backgroundColor: 'rgba(240, 180, 41, 0.2)',
                color: '#f0b429',
                padding: '1px 4px',
                borderRadius: '4px',
                border: '1px solid rgba(240, 180, 41, 0.3)',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}>
                Planning
              </span>
            )}
            <span style={{
              fontSize: '10px',
              color: isPlaced ? '#00e676' : '#f0b429',
              fontWeight: 'bold',
            }}>
              {isPlaced ? '●' : '○'}
            </span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}>
          <span>{cargo.cargoId}</span>
          <span>{(cargo.weightKg / 1000).toFixed(1)}t</span>
        </div>
      </div>
    </div>
  );
};

export default CargoManifestPanel;
