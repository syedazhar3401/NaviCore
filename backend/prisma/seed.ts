import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Seed Ports
  const portSingapore = await prisma.portDirectory.upsert({
    where: { name: 'Port of Singapore' },
    update: {},
    create: {
      name: 'Port of Singapore',
      lat: 1.264,
      lng: 103.84,
      fuelPriceUsdPerTon: 580.5,
      portFeesUsd: 15000,
    },
  });

  const portRotterdam = await prisma.portDirectory.upsert({
    where: { name: 'Port of Rotterdam' },
    update: {},
    create: {
      name: 'Port of Rotterdam',
      lat: 51.949,
      lng: 4.144,
      fuelPriceUsdPerTon: 610.2,
      portFeesUsd: 18500,
    },
  });

  // 2. Seed Vessel
  const vessel = await prisma.vessel.create({
    data: {
      name: 'NaviCore One',
      currentLat: 1.264,
      currentLng: 103.84,
      status: 'AT_PORT',
    },
  });

  // 3. Seed Crew
  await prisma.crewMember.createMany({
    data: [
      { name: 'Captain Ahab', role: 'Captain', vesselId: vessel.id, currentZone: 'Bridge' },
      { name: 'Jane Doe', role: 'Chief Engineer', vesselId: vessel.id, currentZone: 'Engine Room' },
      { name: 'John Smith', role: 'Deckhand', vesselId: vessel.id, currentZone: 'Port Deck' },
    ],
  });

  // 4. Seed Voyage
  const voyage = await prisma.voyage.create({
    data: {
      vesselId: vessel.id,
      originPort: portSingapore.name,
      destinationPort: portRotterdam.name,
      status: 'PLANNED',
      runningCost: 0,
    },
  });

  // 5. Seed Cargo — 12 rich items for demo voyage
  await prisma.cargoItem.createMany({
    data: [
      // First 7 pre-placed on ship
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0001',
        label: 'Steel Coils – Lot A',
        type: 'STANDARD',
        weightKg: 24500,
        contents: 'Steel Coils',
        destinationPort: portRotterdam.name,
        owner: 'SteelCorp',
        qrCode: 'QR-CA-001',
        loadStatus: 'LOADED',
        hazardClass: 'NONE',
        deckSlotId: 'B2-R1-C1',
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Handle with care - heavy load',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0002',
        label: 'Palm Oil Drums',
        type: 'LIQUID_BULK',
        weightKg: 18200,
        contents: 'Palm Oil',
        destinationPort: portRotterdam.name,
        owner: 'AgriTrade',
        qrCode: 'QR-CA-002',
        loadStatus: 'LOADED',
        hazardClass: 'NONE',
        deckSlotId: 'B3-R2-C1',
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Sealed drums',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0003',
        label: 'Auto Parts Crate',
        type: 'STANDARD',
        weightKg: 9800,
        contents: 'Auto Parts',
        destinationPort: portRotterdam.name,
        owner: 'AutoSupply',
        qrCode: 'QR-CA-003',
        loadStatus: 'LOADED',
        hazardClass: 'NONE',
        deckSlotId: 'B4-R1-C2',
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Fragile components inside',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0004',
        label: 'Chemical Fertilizer',
        type: 'HAZMAT',
        weightKg: 14700,
        contents: 'Fertilizer',
        destinationPort: portRotterdam.name,
        owner: 'AgriChem',
        qrCode: 'QR-CA-004',
        loadStatus: 'LOADED',
        hazardClass: 'FLAMMABLE',
        deckSlotId: 'B5-R2-C2',
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Keep away from heat sources',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0005',
        label: 'Frozen Seafood',
        type: 'REFRIGERATED',
        weightKg: 6200,
        contents: 'Seafood',
        destinationPort: portRotterdam.name,
        owner: 'OceanFresh',
        qrCode: 'QR-CA-005',
        loadStatus: 'LOADED',
        hazardClass: 'NONE',
        deckSlotId: 'B6-R1-C1',
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Maintain -18°C',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0006',
        label: 'Rubber Bales',
        type: 'STANDARD',
        weightKg: 11300,
        contents: 'Rubber',
        destinationPort: portRotterdam.name,
        owner: 'RubberMfg',
        qrCode: 'QR-CA-006',
        loadStatus: 'LOADED',
        hazardClass: 'NONE',
        deckSlotId: 'B1-R1-C2',
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Keep dry',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0007',
        label: 'Timber Planks',
        type: 'STANDARD',
        weightKg: 19800,
        contents: 'Timber',
        destinationPort: portRotterdam.name,
        owner: 'WoodWorks',
        qrCode: 'QR-CA-007',
        loadStatus: 'LOADED',
        hazardClass: 'NONE',
        deckSlotId: 'B7-R1-C1',
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Treated wood',
      },
      // Last 5 unplaced - waiting to be arranged
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0008',
        label: 'Industrial Solvents',
        type: 'HAZMAT',
        weightKg: 8400,
        contents: 'Solvents',
        destinationPort: portRotterdam.name,
        owner: 'ChemCorp',
        qrCode: 'QR-CA-008',
        loadStatus: 'MANIFESTED',
        hazardClass: 'TOXIC',
        deckSlotId: null,
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Toxic - handle with PPE',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0009',
        label: 'Ceramic Tiles',
        type: 'STANDARD',
        weightKg: 16500,
        contents: 'Ceramics',
        destinationPort: portRotterdam.name,
        owner: 'TileMfg',
        qrCode: 'QR-CA-009',
        loadStatus: 'MANIFESTED',
        hazardClass: 'NONE',
        deckSlotId: null,
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Fragile - no stacking',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0010',
        label: 'Cotton Bales',
        type: 'STANDARD',
        weightKg: 7200,
        contents: 'Cotton',
        destinationPort: portRotterdam.name,
        owner: 'TextileCo',
        qrCode: 'QR-CA-010',
        loadStatus: 'MANIFESTED',
        hazardClass: 'NONE',
        deckSlotId: null,
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Keep away from moisture',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0011',
        label: 'Electronics Pallets',
        type: 'STANDARD',
        weightKg: 5100,
        contents: 'Electronics',
        destinationPort: portRotterdam.name,
        owner: 'TechCorp',
        qrCode: 'QR-CA-011',
        loadStatus: 'MANIFESTED',
        hazardClass: 'NONE',
        deckSlotId: null,
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'ESD sensitive',
      },
      {
        voyageId: voyage.id,
        cargoId: 'CARGO-0012',
        label: 'Lubricant Barrels',
        type: 'LIQUID_BULK',
        weightKg: 12600,
        contents: 'Lubricants',
        destinationPort: portRotterdam.name,
        owner: 'OilMfg',
        qrCode: 'QR-CA-012',
        loadStatus: 'MANIFESTED',
        hazardClass: 'CORROSIVE',
        deckSlotId: null,
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: 'Corrosive - use gloves',
      },
    ],
  });

  console.log('Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
