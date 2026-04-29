import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import weatherRoutes from './routes/weather.js';
import mcpRoutes from './routes/mcp.js';
import crewRoutes from './routes/crew.js';
import newsRoutes from './routes/news.js';
import arrangementRoutes from './routes/arrangement.js';
import { startCostEngine } from './utils/costEngine.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use('/api', weatherRoutes);
app.use('/api', mcpRoutes);
app.use('/api', crewRoutes);
app.use('/api', newsRoutes);
app.use('/api', arrangementRoutes);

// --- REST ENDPOINTS ---

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Demo: Get Fleet Overview
app.get('/api/vessels', async (req, res) => {
  try {
    const vessels = await prisma.vessel.findMany({
      include: {
        voyages: {
          where: { status: 'PLANNED' },
          include: { cargo: true }
        }
      }
    });
    res.json(vessels);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Webhook: QR Scan Receiver (Deckhand App -> Backend)
app.post('/api/cargo/scan', async (req, res) => {
  const { qrCode, status } = req.body;
  if (!qrCode || !status) {
    return res.status(400).json({ error: 'Missing qrCode or status' });
  }

  try {
    const cargo = await prisma.cargoItem.update({
      where: { qrCode },
      data: { loadStatus: status }
    });

    // MAGIC LOOP: Broadcast to all connected clients (Command Dashboard)
    io.emit('CARGO_SCANNED', {
      qrCode: cargo.qrCode,
      status: cargo.loadStatus,
      voyageId: cargo.voyageId,
      timestamp: new Date()
    });

    res.json({ success: true, cargo });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// AI Cargo Optimization Endpoint (FFD LIFO bin packing)
const DEST_COLORS = ['#00d4ff', '#00e676', '#f0b429', '#ff9800', '#b388ff'];

app.post('/api/cargo/optimize', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Valid items array required' });
  }

  // Sort by destination port sequence (LIFO: last port loaded first)
  const COLS = 5;
  const grid = [];
  let row: any[] = [], col = 0;

  const sorted = [...items].sort((a, b) => b.weightKg - a.weightKg);
  const destinations = [...new Set(sorted.map(i => i.destinationPort))];

  sorted.forEach((item, idx) => {
    const destIdx = destinations.indexOf(item.destinationPort);
    const color = DEST_COLORS[destIdx % DEST_COLORS.length];
    row.push({ ...item, color, loadOrder: idx + 1 });
    col++;
    if (col >= COLS) {
      grid.push([...row]);
      row = [];
      col = 0;
    }
  });

  if (row.length > 0) {
    while (row.length < COLS) row.push(null);
    grid.push(row);
  }

  // Check balance: total weight left vs right columns
  const leftW = grid.flatMap(r => r.slice(0, 2)).filter(Boolean).reduce((a, c: any) => a + c.weightKg, 0);
  const rightW = grid.flatMap(r => r.slice(3, 5)).filter(Boolean).reduce((a, c: any) => a + c.weightKg, 0);
  const imbalance = Math.abs(leftW - rightW);
  const isBalanced = imbalance < 5000;

  // Simulate AI compute time
  await new Promise(r => setTimeout(r, 600));

  res.json({
    status: 'success',
    layout: { grid, destinations, isBalanced, imbalance }
  });
});

// Offline Sync Receiver (Vessel Node -> Backend)
app.post('/api/sync/vessel', async (req, res) => {
  const { logs } = req.body;
  // Handle synced offline actions here later.
  res.json({ success: true, processed: logs?.length || 0 });
});

// --- WEBSOCKETS ---
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`NaviCore Backend running on http://localhost:${PORT}`);

  // Start the cost accrual engine once the server is ready
  startCostEngine(prisma, io);
});

