// Balance Engine for Cargo Arrangement
// Client-side stability calculations for instant feedback

import { SLOT_MAP } from '../data/slotMap.js';

/**
 * Calculate stability metrics for a given cargo layout
 * @param {Array} cargo - Array of cargo items with deckSlotId and weightKg
 * @returns {Object} Stability metrics and slot colors
 */
export function calculateBalance(cargo) {
  // Filter only placed cargo
  const placedCargo = cargo.filter((item) => item.deckSlotId && SLOT_MAP[item.deckSlotId]);

  if (placedCargo.length === 0) {
    return {
      stabilityScore: 100,
      portKg: 0,
      starboardKg: 0,
      centerKg: 0,
      foreKg: 0,
      aftKg: 0,
      midKg: 0,
      totalKg: 0,
      psDeviation: 0,
      faDeviation: 0,
      hazardViolations: 0,
      slotColors: {},
    };
  }

  // Parse cargo with slot info
  const parsed = placedCargo.map((item) => {
    const slotInfo = SLOT_MAP[item.deckSlotId];
    return {
      ...item,
      bay: slotInfo.bay,
      side: slotInfo.side,
      row: slotInfo.row,
    };
  });

  const totalKg = parsed.reduce((sum, item) => sum + item.weightKg, 0);

  // Calculate weights by zone
  const portKg = parsed
    .filter((item) => item.side === 'port')
    .reduce((sum, item) => sum + item.weightKg, 0);

  const starboardKg = parsed
    .filter((item) => item.side === 'starboard')
    .reduce((sum, item) => sum + item.weightKg, 0);

  const centerKg = parsed
    .filter((item) => item.side === 'center')
    .reduce((sum, item) => sum + item.weightKg, 0);

  // Fore = bays 1-3, Mid = bay 4, Aft = bays 5-7
  const foreKg = parsed
    .filter((item) => item.bay <= 3)
    .reduce((sum, item) => sum + item.weightKg, 0);

  const midKg = parsed
    .filter((item) => item.bay === 4)
    .reduce((sum, item) => sum + item.weightKg, 0);

  const aftKg = parsed
    .filter((item) => item.bay >= 5)
    .reduce((sum, item) => sum + item.weightKg, 0);

  // Calculate deviations
  const psDeviation = totalKg > 0 ? (Math.abs(portKg - starboardKg) / totalKg) * 100 : 0;
  const faDeviation = totalKg > 0 ? (Math.abs(foreKg - aftKg) / totalKg) * 100 : 0;

  // Hazard violations: HAZMAT too close to REFRIGERATED
  let hazardViolations = 0;
  const hazmatItems = parsed.filter((item) => item.hazardClass && item.hazardClass !== 'NONE');
  const reeferItems = parsed.filter((item) => item.type === 'REFRIGERATED');

  for (const haz of hazmatItems) {
    for (const ref of reeferItems) {
      // Violation if HAZMAT is within 1 bay of REFRIGERATED
      if (Math.abs(haz.bay - ref.bay) <= 1) {
        hazardViolations++;
      }
    }
  }

  // Also check HAZMAT isolation (should be in B5-B7 ideally)
  for (const haz of hazmatItems) {
    if (haz.bay < 4) {
      hazardViolations += 0.5; // Minor penalty for forward HAZMAT placement
    }
  }

  const hazardPenalty = hazardViolations * 20;

  // Calculate stability score (0-100)
  let stabilityScore = 100 - psDeviation * 0.5 - faDeviation * 0.3 - hazardPenalty;
  stabilityScore = Math.max(0, Math.min(100, stabilityScore));

  // Calculate slot colors based on contribution to imbalance
  const slotColors = {};
  const worstAxisMultiplier = Math.max(psDeviation, faDeviation) / 50 + 1;

  for (const item of parsed) {
    const contribution = (item.weightKg / totalKg) * 100 * worstAxisMultiplier;

    let color = 'blue'; // < 5% contribution

    // Check for hazard violations first (always red)
    const isHazmatViolation =
      item.hazardClass &&
      item.hazardClass !== 'NONE' &&
      reeferItems.some((r) => Math.abs(r.bay - item.bay) <= 1);

    if (isHazmatViolation) {
      color = 'red';
    } else if (contribution > 30) {
      color = 'red';
    } else if (contribution > 15) {
      color = 'yellow';
    } else if (contribution > 5) {
      color = 'green';
    }

    slotColors[item.deckSlotId] = color;
  }

  return {
    stabilityScore: Math.round(stabilityScore),
    portKg,
    starboardKg,
    centerKg,
    foreKg,
    midKg,
    aftKg,
    totalKg,
    psDeviation: Math.round(psDeviation * 10) / 10,
    faDeviation: Math.round(faDeviation * 10) / 10,
    hazardViolations: Math.round(hazardViolations),
    slotColors,
  };
}

/**
 * Get stability status text and color
 * @param {number} score - Stability score (0-100)
 * @returns {Object} Status text and color
 */
export function getStabilityStatus(score) {
  if (score >= 90) {
    return { text: 'Excellent', color: '#00e676', icon: '✓' };
  } else if (score >= 75) {
    return { text: 'Good', color: '#00d4ff', icon: '✓' };
  } else if (score >= 60) {
    return { text: 'Fair', color: '#f0b429', icon: '⚠' };
  } else if (score >= 40) {
    return { text: 'Poor', color: '#ff9800', icon: '⚠' };
  } else {
    return { text: 'Critical', color: '#ff5252', icon: '✕' };
  }
}

/**
 * Format weight in kg to readable string
 * @param {number} kg - Weight in kilograms
 * @returns {string} Formatted weight
 */
export function formatWeight(kg) {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${kg}kg`;
}

/**
 * Check if a cargo placement is valid
 * @param {Object} cargo - Cargo item to place
 * @param {string} slotId - Target slot ID
 * @param {Array} existingCargo - All existing cargo
 * @returns {Object} Validation result
 */
export function validatePlacement(cargo, slotId, existingCargo) {
  const errors = [];
  const warnings = [];

  // Check if slot is already occupied
  const occupied = existingCargo.find((c) => c.deckSlotId === slotId && c.id !== cargo.id);
  if (occupied) {
    errors.push(`Slot ${slotId} is already occupied by ${occupied.cargoId}`);
  }

  const slotInfo = SLOT_MAP[slotId];
  if (!slotInfo) {
    errors.push(`Invalid slot: ${slotId}`);
    return { valid: false, errors, warnings };
  }

  // HAZMAT checks
  if (cargo.hazardClass && cargo.hazardClass !== 'NONE') {
    // Warning if HAZMAT is placed forward of bay 4
    if (slotInfo.bay < 4) {
      warnings.push('HAZMAT should ideally be placed aft (bays 4-7)');
    }

    // Check proximity to REFRIGERATED cargo
    const nearbyReefers = existingCargo.filter((c) => {
      if (c.type !== 'REFRIGERATED' || !c.deckSlotId) return false;
      const otherSlot = SLOT_MAP[c.deckSlotId];
      if (!otherSlot) return false;
      return Math.abs(otherSlot.bay - slotInfo.bay) <= 1;
    });

    if (nearbyReefers.length > 0) {
      errors.push('HAZMAT cannot be placed within 1 bay of refrigerated cargo');
    }
  }

  // REFRIGERATED checks
  if (cargo.type === 'REFRIGERATED') {
    const nearbyHazmat = existingCargo.filter((c) => {
      if (!c.hazardClass || c.hazardClass === 'NONE' || !c.deckSlotId) return false;
      const otherSlot = SLOT_MAP[c.deckSlotId];
      if (!otherSlot) return false;
      return Math.abs(otherSlot.bay - slotInfo.bay) <= 1;
    });

    if (nearbyHazmat.length > 0) {
      errors.push('Refrigerated cargo cannot be placed within 1 bay of HAZMAT');
    }
  }

  // Weight distribution warning for heavy items
  if (cargo.weightKg > 20000 && slotInfo.bay !== 4) {
    warnings.push('Heavy cargo (>20t) should ideally be placed in center bay (B4)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * AI Optimizer - Propose optimal cargo placement
 * @param {Array} unplacedCargo - Cargo items without deckSlotId
 * @param {Array} placedCargo - Already placed cargo items
 * @returns {Array} Proposed placements [{ cargoId, deckSlotId }]
 */
export function runAIOptimizer(unplacedCargo, placedCargo) {
  const proposed = [];
  const usedSlots = new Set(placedCargo.map((c) => c.deckSlotId).filter(Boolean));

  // Get all available slots
  const allSlotIds = Object.keys(SLOT_MAP);
  const availableSlots = allSlotIds.filter((s) => !usedSlots.has(s));

  // Sort cargo heaviest first
  const sortedCargo = [...unplacedCargo].sort((a, b) => b.weightKg - a.weightKg);

  // Helper functions
  const getBay = (slot) => SLOT_MAP[slot]?.bay || 0;
  const getSide = (slot) => SLOT_MAP[slot]?.side || 'center';

  // Center bays priority for heavy items
  const bayPriority = [4, 3, 5, 2, 6, 1, 7];

  for (const cargo of sortedCargo) {
    let bestSlot = null;

    if (cargo.hazardClass && cargo.hazardClass !== 'NONE') {
      // HAZMAT: Find isolated bay away from reefers
      const reeferBays = placedCargo
        .filter((c) => c.type === 'REFRIGERATED' && c.deckSlotId)
        .map((c) => getBay(c.deckSlotId));

      const hazmatBays = [5, 6, 7, 1]; // Priority: aft first
      for (const bay of hazmatBays) {
        if (reeferBays.includes(bay)) continue;
        for (let row = 1; row <= 3; row++) {
          for (let col = 1; col <= 3; col++) {
            const slot = `B${bay}-R${row}-C${col}`;
            if (availableSlots.includes(slot) && !usedSlots.has(slot)) {
              bestSlot = slot;
              break;
            }
          }
          if (bestSlot) break;
        }
        if (bestSlot) break;
      }
    } else {
      // Standard cargo: Center bays, alternate sides for balance
      for (const bay of bayPriority) {
        // Count current weight on each side in this bay
        const bayCargo = placedCargo.filter((c) => getBay(c.deckSlotId) === bay);
        const portWeight = bayCargo
          .filter((c) => getSide(c.deckSlotId) === 'port')
          .reduce((s, c) => s + c.weightKg, 0);
        const starboardWeight = bayCargo
          .filter((c) => getSide(c.deckSlotId) === 'starboard')
          .reduce((s, c) => s + c.weightKg, 0);

        // Prefer lighter side
        const cols = portWeight <= starboardWeight ? [1, 3, 2] : [3, 1, 2];

        for (const col of cols) {
          for (let row = 1; row <= 3; row++) {
            const slot = `B${bay}-R${row}-C${col}`;
            if (availableSlots.includes(slot) && !usedSlots.has(slot)) {
              bestSlot = slot;
              break;
            }
          }
          if (bestSlot) break;
        }
        if (bestSlot) break;
      }
    }

    if (bestSlot) {
      proposed.push({ cargoId: cargo.id, deckSlotId: bestSlot });
      usedSlots.add(bestSlot);
    }
  }

  return proposed;
}
