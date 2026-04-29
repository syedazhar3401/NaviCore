import React from 'react';
import { getStabilityStatus } from '../utils/balanceEngine.js';

const StabilityGauge = ({ score }) => {
  const status = getStabilityStatus(score);
  const percentage = Math.max(0, Math.min(100, score));
  
  // Calculate bar segments
  const segments = 10;
  const filledSegments = Math.round((percentage / 100) * segments);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ 
        fontSize: '24px', 
        fontWeight: 'bold',
        color: status.color,
        minWidth: '50px'
      }}>
        {percentage}
      </div>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '2px',
          alignItems: 'center'
        }}>
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '16px',
                backgroundColor: i < filledSegments ? status.color : 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                transition: 'background-color 0.3s ease'
              }}
            />
          ))}
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {status.icon} {status.text} Stability
        </div>
      </div>
    </div>
  );
};

export default StabilityGauge;
