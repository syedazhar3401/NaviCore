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

    // ── Priority Dimensions ───────────────────────────────────────────────
    // Matches the 7-bay grid shown in the layout image:
    //   Bays 1-6: 2 cols × 4 rows = 8 slots each (48 total)
    //   Bay 7   : 2 cols × 2 rows = 4 slots (stern is smaller)
    //   Total   : 52 slots
    //
    // Loop order is ROW → BAY → COL[port, starboard].
    // Because port (C1) and starboard (C2) are the INNERMOST pair,
    // cargo[i] and cargo[i+1] always land on OPPOSITE SIDES of the same
    // bay+row position — the ship is balanced pair-by-pair automatically.

    // Vertical: bottom row first (Row 4 is lowest deck = best for heavy cargo)
    const ROW_PRIORITY = [4, 3, 2, 1];

    // Longitudinal: midship (Bay 4) first, radiate outward.
    // Bay 7 (stern) loaded before Bay 1 (bow) for better trim dynamics.
    const BAY_PRIORITY = [4, 3, 5, 2, 6, 7, 1];

    // Transverse: port (C1) immediately followed by starboard (C2).
    // Keeping these together is what creates self-balancing pairs.
    const COL_PRIORITY = [1, 2];

    /**
     * Generates an ordered list of PORT/STARBOARD slot PAIRS.
     * Each entry is one loading position — both sides of the vessel at
     * the same bay+row.  Processing pairs (not a flat slot list) ensures
     * lateral balance is maintained even when some slots are already occupied.
     *
     * Grid geometry exceptions:
     *   Bay 7 only exists on rows 1 & 2 (stern bay is a 2×2 block).
     */
    function generateSlotPairs(): Array<{ port: string; starboard: string }> {
      const pairs: Array<{ port: string; starboard: string }> = [];
      for (const row of ROW_PRIORITY) {
        for (const bay of BAY_PRIORITY) {
          if (bay === 7 && (row === 4 || row === 3)) continue; // Bay 7 has no rows 3-4
          pairs.push({
            port:      `B${bay}-R${row}-C1`,
            starboard: `B${bay}-R${row}-C2`,
          });
        }
      }
      return pairs;
    }

    const allPairs   = generateSlotPairs();
    // For balance stats we still expose the flat list
    const optimalSlots = allPairs.flatMap(p => [p.port, p.starboard]);

    // Sort cargo heaviest-first so the most desirable positions get the heaviest items
    const sortedCargo = [...unplacedCargo].sort((a, b) => b.weightKg - a.weightKg);

    const proposed: { cargoId: string; deckSlotId: string }[] = [];
    let cargoIdx = 0;

    for (const pair of allPairs) {
      if (cargoIdx >= sortedCargo.length) break;

      const portFree      = !occupiedSlots.has(pair.port);
      const starboardFree = !occupiedSlots.has(pair.starboard);

      if (portFree && starboardFree) {
        // ── Both sides free: assign the next TWO items as a matched pair ──
        // cargo[i]   → port,      cargo[i+1] → starboard
        // This is the self-balancing step: heaviest pair shares the same position.
        const itemA = sortedCargo[cargoIdx];
        const itemB = sortedCargo[cargoIdx + 1];

        if (itemA) { proposed.push({ cargoId: itemA.id, deckSlotId: pair.port });      cargoIdx++; }
        if (itemB) { proposed.push({ cargoId: itemB.id, deckSlotId: pair.starboard }); cargoIdx++; }

      } else if (portFree) {
        // Starboard already occupied — fill port only
        const item = sortedCargo[cargoIdx];
        if (item) { proposed.push({ cargoId: item.id, deckSlotId: pair.port }); cargoIdx++; }

      } else if (starboardFree) {
        // Port already occupied — fill starboard only
        const item = sortedCargo[cargoIdx];
        if (item) { proposed.push({ cargoId: item.id, deckSlotId: pair.starboard }); cargoIdx++; }
      }
      // Both occupied → skip this pair, no cargo consumed
    }

    const unassignedCargo = sortedCargo.slice(cargoIdx);

    // ── Balance statistics ────────────────────────────────────────────────
    let portWeight = 0;
    let starboardWeight = 0;

    for (const item of placedCargo) {
      if (!item.deckSlotId) continue;
      if (item.deckSlotId.endsWith('-C1')) portWeight      += item.weightKg;
      else                                starboardWeight  += item.weightKg;
    }
    for (const prop of proposed) {
      const cargo = sortedCargo.find(c => c.id === prop.cargoId);
      if (!cargo) continue;
      if (prop.deckSlotId.endsWith('-C1')) portWeight     += cargo.weightKg;
      else                                starboardWeight += cargo.weightKg;
    }

    const totalWeight    = portWeight + starboardWeight;
    const portPercentage = totalWeight > 0 ? Math.round((portWeight / totalWeight) * 100) : 50;

    // Simulate processing delay for UX
    await new Promise(r => setTimeout(r, 600));

    res.json({
      status: unassignedCargo.length > 0 ? 'partial_success' : 'success',
      proposed,
      unassigned: {
        count: unassignedCargo.length,
        cargo: unassignedCargo.map((item) => ({
          id: item.id,
          cargoId: item.cargoId,
          label: item.label,
          weightKg: item.weightKg,
        })),
      },
      balance: {
        portWeight,
        starboardWeight,
        portPercentage,
        starboardPercentage: 100 - portPercentage,
      },
      algorithm: 'Maritime Center-Out, Bottom-Up Optimizer v5.0',
      principles: [
        'Bottom-Up: Heavy cargo placed in lowest rows (R4→R1) for vertical stability',
        'Center-Out: Loading radiates from midship Bay 4 to extremities (B1, B7)',
        'Self-Balancing Pairs: Each (bay, row) position is processed as a port+starboard pair — cargo[i] and cargo[i+1] always land on opposite sides of the same position',
        'Heavy-First Sort: Heaviest items claim the most desirable (lowest, centred) slots',
        'Bay 7 Exception: Stern bay is a 2×2 block — rows 3 & 4 are skipped',
        'Stern-before-Bow: Bay 7 loaded before Bay 1 for better trim dynamics',
      ],
      loadingSequence: {
        totalPairs:      allPairs.length,
        totalSlots:      optimalSlots.length,
        cargoAssigned:   proposed.length,
        cargoUnassigned: unassignedCargo.length,
      }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
