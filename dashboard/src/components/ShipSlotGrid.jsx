import React from 'react';
import { SLOT_MAP, CONTAINER_IMAGES, CONTAINER_SIZE } from '../data/slotMap.js';

const ShipSlotGrid = ({ 
  cargo, 
  slotColors, 
  selectedCargoId, 
  selectedSlotId,
  proposedSlots,
  pendingPlacement,
  onSlotClick,
  imageUrl = '/ship/ship-overhead.png'
}) => {
  // Build a map of slotId -> cargo
  const slotCargoMap = {};
  cargo.forEach(c => {
    if (c.deckSlotId) {
      slotCargoMap[c.deckSlotId] = c;
    }
  });

  const allSlotIds = Object.keys(SLOT_MAP);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Ship Image */}
      <img
        src={imageUrl}
        alt="Ship Overhead View"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          opacity: 0.95,
        }}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />

      {/* Slot Grid Overlay with Containers */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}>
        {allSlotIds.map(slotId => {
          const slotInfo = SLOT_MAP[slotId];
          const occupyingCargo = slotCargoMap[slotId];
          const color = slotColors?.[slotId] || 'blue';
          const proposedCargoId = proposedSlots?.[slotId];
          const proposedCargoExists = proposedCargoId && cargo.some((c) => c.id === proposedCargoId);
          const isProposed = !!proposedCargoExists && !occupyingCargo;
          const isPendingTarget = pendingPlacement?.toSlotId === slotId;
          const isSelected = selectedSlotId === slotId;
          const isOccupied = !!occupyingCargo;

          return (
            <Slot
              key={slotId}
              slotId={slotId}
              xPct={slotInfo.xPct}
              yPct={slotInfo.yPct}
              cargo={occupyingCargo}
              color={color}
              isProposed={isProposed}
              isPendingTarget={isPendingTarget}
              isSelected={isSelected}
              isOccupied={isOccupied}
              selectedCargoId={selectedCargoId}
              onClick={() => onSlotClick(slotId)}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        display: 'flex',
        gap: '12px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '8px 12px',
        borderRadius: '8px',
      }}>
        <LegendItem color="#2196f3" label="Balanced" />
        <LegendItem color="#4caf50" label="Good" />
        <LegendItem color="#ff9800" label="Caution" />
        <LegendItem color="#f44336" label="Danger" />
      </div>
    </div>
  );
};

const Slot = ({ 
  slotId, 
  xPct, 
  yPct, 
  cargo, 
  color, 
  isProposed,
  isPendingTarget,
  isSelected,
  isOccupied,
  selectedCargoId,
  onClick
}) => {
  const size = CONTAINER_SIZE;
  
  // Determine which container image to use
  const containerImage = CONTAINER_IMAGES[color] || CONTAINER_IMAGES.blue;

  // Visual states
  let opacity = 0.4;
  let borderStyle = 'solid';
  let borderColor = 'rgba(255,255,255,0.2)';
  let boxShadow = 'none';

  if (isOccupied) {
    opacity = 1;
    borderColor = 'transparent';
  } else if (isPendingTarget) {
    opacity = 0.85;
    borderStyle = 'dashed';
    borderColor = '#00d4ff';
    boxShadow = '0 0 14px rgba(0,212,255,0.5)';
  } else if (isProposed) {
    opacity = 0.7;
    borderStyle = 'dashed';
    borderColor = '#9c27b0';
  } else if (selectedCargoId && !isOccupied) {
    // Available for placement
    opacity = 0.6;
    borderColor = 'var(--cyan-glow)';
    boxShadow = '0 0 10px rgba(0,212,255,0.3)';
  }

  if (isSelected) {
    borderColor = '#fff';
    boxShadow = '0 0 15px rgba(255,255,255,0.5)';
    opacity = 1;
  }

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: `${yPct}%`,
        width: `${size.widthPct}%`,
        height: `${size.heightPct}%`,
        transform: 'translate(-50%, -50%)',
        cursor: selectedCargoId || isOccupied ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        border: `2px ${borderStyle} ${borderColor}`,
        borderRadius: '4px',
        boxShadow,
        overflow: 'hidden',
        backgroundColor: isOccupied ? 'transparent' : 'rgba(255,255,255,0.05)',
      }}
      title={cargo ? `${cargo.cargoId}: ${cargo.label}` : `Empty slot ${slotId}`}
    >
      {isOccupied ? (
        <img
          src={containerImage}
          alt="Container"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity,
          }}
        />
      ) : isProposed ? (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(156,39,176,0.3)',
        }}>
          <span style={{
            fontSize: '14px',
            color: '#e1bee7',
            fontWeight: 'bold',
          }}>
            ?
          </span>
        </div>
      ) : null}
    </div>
  );
};

const LegendItem = ({ color, label }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }}>
    <div style={{
      width: '12px',
      height: '12px',
      backgroundColor: color,
      borderRadius: '2px',
    }} />
    <span style={{
      fontSize: '10px',
      color: 'var(--text-secondary)',
    }}>
      {label}
    </span>
  </div>
);

export default ShipSlotGrid;
