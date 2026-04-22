import { PrismaClient } from '@prisma/client';
import type { Server } from 'socket.io';

/**
 * Voyage Cost Accrual Engine
 * 
 * Ticks periodically to calculate running costs for active voyages.
 * Uses exact delta-time to prevent drift from setInterval inaccuracy.
 * Emits COST_UPDATE events via Socket.io for real-time dashboard updates.
 */

const TICK_INTERVAL_MS = 5000; // 5 seconds
let tickTimer: ReturnType<typeof setInterval> | null = null;

export function startCostEngine(prisma: PrismaClient, io: Server) {
  if (tickTimer) {
    console.warn('[CostEngine] Already running — skipping duplicate start');
    return;
  }

  console.log('[CostEngine] Starting voyage cost accrual engine');

  tickTimer = setInterval(async () => {
    try {
      await tick(prisma, io);
    } catch (err) {
      console.error('[CostEngine] Tick error:', err);
    }
  }, TICK_INTERVAL_MS);
}

export function stopCostEngine() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
    console.log('[CostEngine] Stopped');
  }
}

async function tick(prisma: PrismaClient, io: Server) {
  const now = new Date();

  // Fetch all ONGOING voyages with their cost config and vessel crew
  const voyages = await prisma.voyage.findMany({
    where: { status: 'ONGOING' },
    include: {
      costConfig: true,
      vessel: {
        include: {
          crew: {
            where: { isActive: true },
            include: {
              shifts: {
                where: { endTime: null }, // only open shifts
              },
            },
          },
        },
      },
    },
  });

  for (const voyage of voyages) {
    // --- Config Validation ---
    if (!voyage.costConfig?.fuelPriceUsdPerTon || !voyage.costConfig?.fuelConsumptionTph) {
      io.emit('SYSTEM_ALERT', {
        type: 'MISSING_COST_CONFIG',
        voyageId: voyage.id,
        message: `Voyage ${voyage.id} is missing cost configuration — skipping accrual`,
        timestamp: now.toISOString(),
      });
      continue;
    }

    const config = voyage.costConfig;
    const lastTickAt = voyage.lastTickAt;

    // --- Time Drift Prevention ---
    // Never assume fixed interval; calculate exact delta
    const dtMs = now.getTime() - lastTickAt.getTime();
    const dtHours = dtMs / (1000 * 60 * 60);

    if (dtHours <= 0) continue; // safety check

    // --- Fuel Cost ---
    const fuelCost = config.fuelConsumptionTph * dtHours * config.fuelPriceUsdPerTon;

    // --- Crew Cost (Precise Payroll Sync) ---
    let crewCost = 0;
    const activeCrew = voyage.vessel?.crew ?? [];

    for (const member of activeCrew) {
      for (const shift of member.shifts) {
        // Calculate overlapping time: duration = min(now, shift.endTime || now) - max(lastTickAt, shift.startTime)
        const shiftStart = shift.startTime;
        const shiftEnd = shift.endTime ?? now;
        const overlapStart = new Date(Math.max(lastTickAt.getTime(), shiftStart.getTime()));
        const overlapEnd = new Date(Math.min(now.getTime(), shiftEnd.getTime()));

        const overlapHours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
        if (overlapHours > 0) {
          crewCost += member.hourlyRate * overlapHours;
        }
      }
    }

    const totalIncrement = fuelCost + crewCost;
    const totalIncrementCents = Math.round(totalIncrement * 100);

    // --- Atomic DB Update ---
    await prisma.voyage.update({
      where: { id: voyage.id },
      data: {
        runningCost: { increment: totalIncrement },
        runningCostCents: { increment: totalIncrementCents },
        lastTickAt: now,
      },
    });

    // --- Targeted Socket Emission ---
    io.emit('COST_UPDATE', {
      voyageId: voyage.id,
      totalCost: voyage.runningCost + totalIncrement,
      fuelRate: fuelCost / dtHours, // $/hr
      crewRate: crewCost / dtHours, // $/hr
      fuelIncrement: fuelCost,
      crewIncrement: crewCost,
      totalIncrement,
      dtHours,
      timestamp: now.toISOString(),
    });
  }
}
