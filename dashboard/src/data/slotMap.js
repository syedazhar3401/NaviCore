// Slot Map for NaviCore Cargo Arrangement
// Calibrated to match yellow box boundaries in ship-overhead.png
// Bays 1-6: 2 columns × 4 rows = 8 slots each
// Bay 7: 2 columns × 2 rows = 4 slots
// Total: 52 slots

export const SLOT_MAP = {
  // Bay 1 (Fore) - 8 slots (2 columns × 4 rows)
  "B1-R1-C1": { xPct: 25.4, yPct: 43.2, bay: 1, row: 1, col: 1, side: "port" },
  "B1-R1-C2": { xPct: 28.9, yPct: 43.2, bay: 1, row: 1, col: 2, side: "starboard" },
  "B1-R2-C1": { xPct: 25.4, yPct: 47.2, bay: 1, row: 2, col: 1, side: "port" },
  "B1-R2-C2": { xPct: 28.9, yPct: 47.2, bay: 1, row: 2, col: 2, side: "starboard" },
  "B1-R3-C1": { xPct: 25.4, yPct: 51.2, bay: 1, row: 3, col: 1, side: "port" },
  "B1-R3-C2": { xPct: 28.9, yPct: 51.2, bay: 1, row: 3, col: 2, side: "starboard" },
  "B1-R4-C1": { xPct: 25.4, yPct: 55.2, bay: 1, row: 4, col: 1, side: "port" },
  "B1-R4-C2": { xPct: 28.9, yPct: 55.2, bay: 1, row: 4, col: 2, side: "starboard" },

  // Bay 2 - 8 slots (9.5% spacing from Bay 1)
  "B2-R1-C1": { xPct: 34.9, yPct: 43.2, bay: 2, row: 1, col: 1, side: "port" },
  "B2-R1-C2": { xPct: 38.4, yPct: 43.2, bay: 2, row: 1, col: 2, side: "starboard" },
  "B2-R2-C1": { xPct: 34.9, yPct: 47.2, bay: 2, row: 2, col: 1, side: "port" },
  "B2-R2-C2": { xPct: 38.4, yPct: 47.2, bay: 2, row: 2, col: 2, side: "starboard" },
  "B2-R3-C1": { xPct: 34.9, yPct: 51.2, bay: 2, row: 3, col: 1, side: "port" },
  "B2-R3-C2": { xPct: 38.4, yPct: 51.2, bay: 2, row: 3, col: 2, side: "starboard" },
  "B2-R4-C1": { xPct: 34.9, yPct: 55.2, bay: 2, row: 4, col: 1, side: "port" },
  "B2-R4-C2": { xPct: 38.4, yPct: 55.2, bay: 2, row: 4, col: 2, side: "starboard" },

  // Bay 3 - 8 slots
  "B3-R1-C1": { xPct: 44.4, yPct: 43.2, bay: 3, row: 1, col: 1, side: "port" },
  "B3-R1-C2": { xPct: 47.9, yPct: 43.2, bay: 3, row: 1, col: 2, side: "starboard" },
  "B3-R2-C1": { xPct: 44.4, yPct: 47.2, bay: 3, row: 2, col: 1, side: "port" },
  "B3-R2-C2": { xPct: 47.9, yPct: 47.2, bay: 3, row: 2, col: 2, side: "starboard" },
  "B3-R3-C1": { xPct: 44.4, yPct: 51.2, bay: 3, row: 3, col: 1, side: "port" },
  "B3-R3-C2": { xPct: 47.9, yPct: 51.2, bay: 3, row: 3, col: 2, side: "starboard" },
  "B3-R4-C1": { xPct: 44.4, yPct: 55.2, bay: 3, row: 4, col: 1, side: "port" },
  "B3-R4-C2": { xPct: 47.9, yPct: 55.2, bay: 3, row: 4, col: 2, side: "starboard" },

  // Bay 4 (Center) - 8 slots (closer to Bay 3 by ~5px)
  "B4-R1-C1": { xPct: 53.5, yPct: 43.2, bay: 4, row: 1, col: 1, side: "port" },
  "B4-R1-C2": { xPct: 57.0, yPct: 43.2, bay: 4, row: 1, col: 2, side: "starboard" },
  "B4-R2-C1": { xPct: 53.5, yPct: 47.2, bay: 4, row: 2, col: 1, side: "port" },
  "B4-R2-C2": { xPct: 57.0, yPct: 47.2, bay: 4, row: 2, col: 2, side: "starboard" },
  "B4-R3-C1": { xPct: 53.5, yPct: 51.2, bay: 4, row: 3, col: 1, side: "port" },
  "B4-R3-C2": { xPct: 57.0, yPct: 51.2, bay: 4, row: 3, col: 2, side: "starboard" },
  "B4-R4-C1": { xPct: 53.5, yPct: 55.2, bay: 4, row: 4, col: 1, side: "port" },
  "B4-R4-C2": { xPct: 57.0, yPct: 55.2, bay: 4, row: 4, col: 2, side: "starboard" },

  // Bay 5 - 8 slots (closer to Bay 4 by ~10px total)
  "B5-R1-C1": { xPct: 62.6, yPct: 43.2, bay: 5, row: 1, col: 1, side: "port" },
  "B5-R1-C2": { xPct: 66.1, yPct: 43.2, bay: 5, row: 1, col: 2, side: "starboard" },
  "B5-R2-C1": { xPct: 62.6, yPct: 47.2, bay: 5, row: 2, col: 1, side: "port" },
  "B5-R2-C2": { xPct: 66.1, yPct: 47.2, bay: 5, row: 2, col: 2, side: "starboard" },
  "B5-R3-C1": { xPct: 62.6, yPct: 51.2, bay: 5, row: 3, col: 1, side: "port" },
  "B5-R3-C2": { xPct: 66.1, yPct: 51.2, bay: 5, row: 3, col: 2, side: "starboard" },
  "B5-R4-C1": { xPct: 62.6, yPct: 55.2, bay: 5, row: 4, col: 1, side: "port" },
  "B5-R4-C2": { xPct: 66.1, yPct: 55.2, bay: 5, row: 4, col: 2, side: "starboard" },

  // Bay 6 - 8 slots (closer to Bay 5 by ~10px total)
  "B6-R1-C1": { xPct: 71.0, yPct: 43.2, bay: 6, row: 1, col: 1, side: "port" },
  "B6-R1-C2": { xPct: 74.4, yPct: 43.2, bay: 6, row: 1, col: 2, side: "starboard" },
  "B6-R2-C1": { xPct: 71.0, yPct: 47.2, bay: 6, row: 2, col: 1, side: "port" },
  "B6-R2-C2": { xPct: 74.4, yPct: 47.2, bay: 6, row: 2, col: 2, side: "starboard" },
  "B6-R3-C1": { xPct: 71.0, yPct: 51.2, bay: 6, row: 3, col: 1, side: "port" },
  "B6-R3-C2": { xPct: 74.4, yPct: 51.2, bay: 6, row: 3, col: 2, side: "starboard" },
  "B6-R4-C1": { xPct: 71.0, yPct: 55.2, bay: 6, row: 4, col: 1, side: "port" },
  "B6-R4-C2": { xPct: 74.4, yPct: 55.2, bay: 6, row: 4, col: 2, side: "starboard" },

  // Bay 7 (Aft) - 4 slots (2×2, smaller bay)
  "B7-R1-C1": { xPct: 80.7, yPct: 47.2, bay: 7, row: 1, col: 1, side: "port" },
  "B7-R1-C2": { xPct: 84.1, yPct: 47.2, bay: 7, row: 1, col: 2, side: "starboard" },
  "B7-R2-C1": { xPct: 80.7, yPct: 51.2, bay: 7, row: 2, col: 1, side: "port" },
  "B7-R2-C2": { xPct: 84.1, yPct: 51.2, bay: 7, row: 2, col: 2, side: "starboard" },
};

// Helper to get all slot IDs
export const getAllSlotIds = () => Object.keys(SLOT_MAP);

// Helper to get slot info by ID
export const getSlotInfo = (slotId) => SLOT_MAP[slotId] || null;

// Helper to get slots by bay
export const getSlotsByBay = (bay) =>
  Object.entries(SLOT_MAP)
    .filter(([_, info]) => info.bay === bay)
    .map(([id, info]) => ({ id, ...info }));

// Helper to get slots by side
export const getSlotsBySide = (side) =>
  Object.entries(SLOT_MAP)
    .filter(([_, info]) => info.side === side)
    .map(([id, info]) => ({ id, ...info }));

// Container image mapping by color
export const CONTAINER_IMAGES = {
  blue: '/containers/container-blue.png',
  green: '/containers/container-green.png',
  yellow: '/containers/container-yellow.png',
  red: '/containers/container-red.png',
};

// Default container size (percentage of ship image)
// Compact sizing to fit within yellow box boundaries
export const CONTAINER_SIZE = {
  widthPct: 3.5,
  heightPct: 4,
};
