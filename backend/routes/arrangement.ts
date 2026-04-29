import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/arrangement/voyages - List all voyages for selector
router.get('/arrangement/voyages', async (req, res) => {
  try {
    const voyages = await prisma.voyage.findMany({
      include: {
        vessel: true,
        cargo: true,
      },
    });
    res.json(voyages);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/arrangement/cargo - Get all cargo for a voyage
router.get('/arrangement/cargo', async (req, res) => {
  const { voyageId } = req.query;
  if (!voyageId || typeof voyageId !== 'string') {
    return res.status(400).json({ error: 'voyageId query param required' });
  }

  try {
    const cargo = await prisma.cargoItem.findMany({
      where: { voyageId },
      orderBy: { cargoId: 'asc' },
    });
    res.json(cargo);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/arrangement/cargo - Create new cargo item
router.post('/arrangement/cargo', async (req, res) => {
  const {
    voyageId,
    cargoId,
    label,
    type,
    weightKg,
    contents,
    destinationPort,
    owner,
    qrCode,
    hazardClass,
    lengthM,
    widthM,
    heightM,
    notes,
  } = req.body;

  if (!voyageId || !cargoId || !label) {
    return res.status(400).json({ error: 'voyageId, cargoId, and label are required' });
  }

  try {
    const cargo = await prisma.cargoItem.create({
      data: {
        voyageId,
        cargoId,
        label,
        type: type || 'STANDARD',
        weightKg: weightKg || 0,
        contents: contents || label,
        destinationPort: destinationPort || '',
        owner: owner || '',
        qrCode: qrCode || `QR-${cargoId}`,
        hazardClass: hazardClass || 'NONE',
        lengthM: lengthM || 6.1,
        widthM: widthM || 2.4,
        heightM: heightM || 2.6,
        notes,
        loadStatus: 'MANIFESTED',
        deckSlotId: null,
      },
    });
    res.json(cargo);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/arrangement/cargo/:id - Edit cargo fields
router.put('/arrangement/cargo/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const cargo = await prisma.cargoItem.update({
      where: { id },
      data: updateData,
    });
    res.json(cargo);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/arrangement/cargo/:id - Remove cargo
router.delete('/arrangement/cargo/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.cargoItem.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/arrangement/layout - Save all slot assignments (batch)
router.put('/arrangement/layout', async (req, res) => {
  const { slots } = req.body;
  if (!slots || !Array.isArray(slots)) {
    return res.status(400).json({ error: 'slots array required' });
  }

  try {
    const updates = await Promise.all(
      slots.map(({ cargoId, deckSlotId }: { cargoId: string; deckSlotId: string | null }) =>
        prisma.cargoItem.update({
          where: { id: cargoId },
          data: {
            deckSlotId,
            loadStatus: deckSlotId ? 'LOADED' : 'MANIFESTED',
          },
        })
      )
    );
    res.json({ success: true, updated: updates.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/arrangement/balance - Run balance algorithm
router.get('/arrangement/balance', async (req, res) => {
  const { voyageId } = req.query;
  if (!voyageId || typeof voyageId !== 'string') {
    return res.status(400).json({ error: 'voyageId query param required' });
  }

  try {
    const cargo = await prisma.cargoItem.findMany({
      where: { voyageId, deckSlotId: { not: null } },
    });

    // Parse slot IDs to get bay and side info
    // New layout: 2 columns (C1=port, C2=starboard)
    const parsed = cargo.map((item) => {
      const match = item.deckSlotId?.match(/B(\d+)-R(\d+)-C(\d+)/);
      if (!match) return null;
      const [, bay, , col] = match.map(Number);
      const side = col === 1 ? 'port' : 'starboard';
      return { ...item, bay, side };
    }).filter(Boolean);

    const totalKg = parsed.reduce((sum, item) => sum + (item?.weightKg || 0), 0);

    // Calculate weights by zone
    const portKg = parsed
      .filter((item) => item?.side === 'port')
      .reduce((sum, item) => sum + (item?.weightKg || 0), 0);
    const starboardKg = parsed
      .filter((item) => item?.side === 'starboard')
      .reduce((sum, item) => sum + (item?.weightKg || 0), 0);
    const foreKg = parsed
      .filter((item) => (item?.bay || 0) <= 3)
      .reduce((sum, item) => sum + (item?.weightKg || 0), 0);
    const aftKg = parsed
      .filter((item) => (item?.bay || 0) >= 5)
      .reduce((sum, item) => sum + (item?.weightKg || 0), 0);

    // Calculate deviations
    const psDeviation = totalKg > 0 ? Math.abs(portKg - starboardKg) / totalKg * 100 : 0;
    const faDeviation = totalKg > 0 ? Math.abs(foreKg - aftKg) / totalKg * 100 : 0;

    // Hazard violations: HAZMAT near REFRIGERATED
    let hazardViolations = 0;
    const hazmatItems = parsed.filter((item) => item?.hazardClass !== 'NONE');
    const reeferItems = parsed.filter((item) => item?.type === 'REFRIGERATED');

    for (const haz of hazmatItems) {
      for (const ref of reeferItems) {
        if (haz && ref && Math.abs(haz.bay - ref.bay) <= 1) {
          hazardViolations++;
        }
      }
    }

    const hazardPenalty = hazardViolations * 20;
    const stabilityScore = Math.max(0, 100 - psDeviation * 0.5 - faDeviation * 0.3 - hazardPenalty);

    // Calculate slot colors
    const slotColors: Record<string, string> = {};
    const worstAxisMultiplier = Math.max(psDeviation, faDeviation) / 50 + 1;

    for (const item of parsed) {
      if (!item) continue;
      const contribution = (item.weightKg / totalKg) * 100 * worstAxisMultiplier;

      let color = 'blue';
      if (item.hazardClass !== 'NONE' && reeferItems.some((r) => r && Math.abs(r.bay - item.bay) <= 1)) {
        color = 'red';
      } else if (contribution > 30) {
        color = 'red';
      } else if (contribution > 15) {
        color = 'yellow';
      } else if (contribution > 5) {
        color = 'green';
      }

      if (item.deckSlotId) {
        slotColors[item.deckSlotId] = color;
      }
    }

    res.json({
      stabilityScore: Math.round(stabilityScore),
      portKg,
      starboardKg,
      foreKg,
      aftKg,
      psDeviation: Math.round(psDeviation * 10) / 10,
      faDeviation: Math.round(faDeviation * 10) / 10,
      hazardViolations,
      slotColors,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/arrangement/ai-optimize - AI optimization
// Maritime Cargo Loading Algorithm: Center-Out, Bottom-Up with Port-Starboard Pairing
router.post('/arrangement/ai-optimize', async (req, res) => {
  const { voyageId } = req.body;
  if (!voyageId) {
    return res.status(400).json({ error: 'voyageId required' });
  }

  try {
    // Get all cargo and current layout for this voyage
    const allCargo = await prisma.cargoItem.findMany({
      where: { voyageId },
    });

    // Get currently placed cargo
    const placedCargo = allCargo.filter(c => c.deckSlotId !== null);
    const unplacedCargo = allCargo.filter(c => c.deckSlotId === null);

    // Track occupied slots
    const occupiedSlots = new Set(placedCargo.map(c => c.deckSlotId));

    // Priority constraints for the loading algorithm
    // 1. Vertical: Bottom to Top (Row 4 = lowest/best for heavy cargo)
    const ROW_PRIORITY = [4, 3, 2, 1];
    // 2. Longitudinal: Center radiating outward (Bay 4 = center of 7 bays)
    const BAY_PRIORITY = [4, 3, 5, 2, 6, 7, 1];
    // 3. Transverse: Port (C1) then Starboard (C2) - paired immediately for balance
    const COL_PRIORITY = [1, 2];

    /**
     * Generates the master priority list of slots based on maritime physics.
     * Heaviest cargo gets the lowest slots in the center bays, with port/starboard paired.
     */
    function generateDesirabilityArray(): string[] {
      const prioritySlots: string[] = [];

      for (const row of ROW_PRIORITY) {
        for (const bay of BAY_PRIORITY) {
          // Bay 7 only has Rows 1 & 2 (stern is smaller)
          if (bay === 7 && (row === 4 || row === 3)) {
            continue;
          }

          for (const col of COL_PRIORITY) {
            prioritySlots.push(`B${bay}-R${row}-C${col}`);
          }
        }
      }

      return prioritySlots;
    }

    // Generate the optimal slot sequence
    const optimalSlots = generateDesirabilityArray();

    // Filter out already occupied slots
    const availableOptimalSlots = optimalSlots.filter(s => !occupiedSlots.has(s));

    // Sort cargo by weight, Heaviest to Lightest
    // This ensures heaviest cargo gets the most desirable slots (lowest, centered)
    const sortedCargo = [...unplacedCargo].sort((a, b) => b.weightKg - a.weightKg);

    // Safety check
    if (sortedCargo.length > availableOptimalSlots.length) {
      return res.status(400).json({
        error: `Ship Overcapacity! Trying to load ${sortedCargo.length} containers into ${availableOptimalSlots.length} available slots.`
      });
    }

    // Assign cargo to slots sequentially
    const proposed: { cargoId: string; deckSlotId: string }[] = [];

    for (let i = 0; i < sortedCargo.length; i++) {
      const cargoItem = sortedCargo[i];
      const assignedSlot = availableOptimalSlots[i];

      proposed.push({
        cargoId: cargoItem.id,
        deckSlotId: assignedSlot
      });
    }

    // Calculate final balance statistics
    const getSideWeights = () => {
      let port = 0, starboard = 0;
      // Include both previously placed and newly proposed cargo
      for (const item of placedCargo) {
        if (!item.deckSlotId) continue;
        const col = parseInt(item.deckSlotId.match(/C(\d+)/)?.[1] || '0');
        if (col === 1) port += item.weightKg;
        else starboard += item.weightKg;
      }
      for (const prop of proposed) {
        const cargo = sortedCargo.find(c => c.id === prop.cargoId);
        if (cargo) {
          const col = parseInt(prop.deckSlotId.match(/C(\d+)/)?.[1] || '0');
          if (col === 1) port += cargo.weightKg;
          else starboard += cargo.weightKg;
        }
      }
      return { port, starboard };
    };

    const finalWeights = getSideWeights();
    const totalWeight = finalWeights.port + finalWeights.starboard;
    const portPercentage = totalWeight > 0 ? Math.round((finalWeights.port / totalWeight) * 100) : 50;

    // Simulate processing delay for UX
    await new Promise(r => setTimeout(r, 600));

    res.json({
      status: 'success',
      proposed,
      unassigned: sortedCargo.length - proposed.length,
      balance: {
        portWeight: finalWeights.port,
        starboardWeight: finalWeights.starboard,
        portPercentage,
        starboardPercentage: 100 - portPercentage,
      },
      algorithm: 'Maritime Center-Out Optimizer v4.0',
      principles: [
        'Bottom-Up: Heavy cargo placed in lowest rows (R4->R1) for vertical stability',
        'Center-Out: Loading radiates from Bay 4 (center) to extremities (B1, B7)',
        'Port-Starboard Pairs: C1 and C2 assigned sequentially for lateral balance',
        'Heavy-First: Sorting by weight ensures optimal weight distribution',
        'Bay 7 Exception: Stern bay only has rows 1-2'
      ],
      loadingSequence: {
        totalSlots: optimalSlots.length,
        availableSlots: availableOptimalSlots.length,
        cargoAssigned: proposed.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
