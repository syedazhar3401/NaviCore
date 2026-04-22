import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// --- Idempotency Key Store (in-memory Set for this iteration) ---
const processedKeys = new Set<string>();

// Clean up old keys every 10 minutes to prevent memory leak
setInterval(() => {
  processedKeys.clear();
}, 10 * 60 * 1000);

// --- Admin Middleware ---
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.headers['x-role'];
  if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required', requiredHeader: 'x-role: ADMIN' });
  }
  next();
}

// --- GET /crew/:vesselId — List crew for a vessel ---
router.get('/crew/:vesselId', async (req: Request, res: Response) => {
  try {
    const crew = await prisma.crewMember.findMany({
      where: { vesselId: req.params['vesselId'] },
      include: {
        shifts: {
          orderBy: { startTime: 'desc' },
          take: 5, // last 5 shifts
        },
      },
    });

    res.json({
      count: crew.length,
      crew: crew.map(c => ({
        id: c.id,
        name: c.name,
        role: c.role,
        hourlyRate: c.hourlyRate,
        isActive: c.isActive,
        currentZone: c.currentZone,
        hasOpenShift: c.shifts.some(s => !s.endTime),
        recentShifts: c.shifts.map(s => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      })),
    });
  } catch (err) {
    console.error('[Crew] List error:', err);
    res.status(500).json({ error: 'Failed to fetch crew' });
  }
});

// --- POST /crew/start-shift — Start a shift (idempotent) ---
router.post('/crew/start-shift', requireAdmin, async (req: Request, res: Response) => {
  const { crewId, zone } = req.body;
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!crewId) {
    return res.status(400).json({ error: 'crewId is required' });
  }

  // --- Idempotency Check ---
  if (idempotencyKey && processedKeys.has(idempotencyKey)) {
    return res.status(200).json({
      idempotent: true,
      message: 'This request was already processed',
    });
  }

  try {
    // --- Double-Pay Prevention: check for open shifts ---
    const openShift = await prisma.shiftLog.findFirst({
      where: { crewId, endTime: null },
    });

    if (openShift) {
      // Mark idempotency key as processed (this is an idempotent "already open" response)
      if (idempotencyKey) processedKeys.add(idempotencyKey);
      return res.status(200).json({
        alreadyOpen: true,
        message: 'Crew member already has an active shift',
        shiftId: openShift.id,
        startTime: openShift.startTime,
      });
    }

    // Start new shift
    const shift = await prisma.shiftLog.create({
      data: {
        crewId,
        startTime: new Date(),
      },
    });

    // Update crew zone if provided
    if (zone) {
      await prisma.crewMember.update({
        where: { id: crewId },
        data: { currentZone: zone, shiftStart: new Date() },
      });
    }

    // Mark idempotency key as processed
    if (idempotencyKey) processedKeys.add(idempotencyKey);

    res.status(201).json({
      success: true,
      shiftId: shift.id,
      crewId,
      startTime: shift.startTime,
      zone: zone || null,
    });
  } catch (err) {
    console.error('[Crew] Start shift error:', err);
    res.status(500).json({ error: 'Failed to start shift' });
  }
});

// --- POST /crew/end-shift — End a shift (idempotent) ---
router.post('/crew/end-shift', requireAdmin, async (req: Request, res: Response) => {
  const { crewId } = req.body;
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!crewId) {
    return res.status(400).json({ error: 'crewId is required' });
  }

  // --- Idempotency Check ---
  if (idempotencyKey && processedKeys.has(idempotencyKey)) {
    return res.status(200).json({
      idempotent: true,
      message: 'This request was already processed',
    });
  }

  try {
    // Find open shift
    const openShift = await prisma.shiftLog.findFirst({
      where: { crewId, endTime: null },
    });

    if (!openShift) {
      if (idempotencyKey) processedKeys.add(idempotencyKey);
      return res.status(200).json({
        alreadyEnded: true,
        message: 'No active shift found for this crew member',
      });
    }

    const endTime = new Date();
    const durationHours = (endTime.getTime() - openShift.startTime.getTime()) / (1000 * 60 * 60);

    // End the shift
    await prisma.shiftLog.update({
      where: { id: openShift.id },
      data: { endTime },
    });

    // Clear crew shift start
    await prisma.crewMember.update({
      where: { id: crewId },
      data: { shiftStart: null },
    });

    if (idempotencyKey) processedKeys.add(idempotencyKey);

    res.json({
      success: true,
      shiftId: openShift.id,
      crewId,
      startTime: openShift.startTime,
      endTime,
      durationHours: Math.round(durationHours * 100) / 100,
    });
  } catch (err) {
    console.error('[Crew] End shift error:', err);
    res.status(500).json({ error: 'Failed to end shift' });
  }
});

// --- POST /crew/add — Add a crew member (admin only) ---
router.post('/crew/add', requireAdmin, async (req: Request, res: Response) => {
  const { name, role, vesselId, hourlyRate, currentZone } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'name and role are required' });
  }

  try {
    const member = await prisma.crewMember.create({
      data: {
        name,
        role,
        vesselId: vesselId || null,
        hourlyRate: hourlyRate || 15.0,
        currentZone: currentZone || null,
      },
    });

    res.status(201).json({ success: true, crew: member });
  } catch (err) {
    console.error('[Crew] Add member error:', err);
    res.status(500).json({ error: 'Failed to add crew member' });
  }
});

export default router;
