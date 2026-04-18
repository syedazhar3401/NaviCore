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

  // 5. Seed Cargo
  await prisma.cargoItem.createMany({
    data: [
      {
        voyageId: voyage.id,
        weightKg: 12500,
        contents: 'Electronics',
        destinationPort: portRotterdam.name,
        owner: 'TechCorp',
        qrCode: 'QR-CA-001',
        loadStatus: 'MANIFESTED',
      },
      {
        voyageId: voyage.id,
        weightKg: 8000,
        contents: 'Textiles',
        destinationPort: portRotterdam.name,
        owner: 'GlobalFabrics',
        qrCode: 'QR-CA-002',
        loadStatus: 'MANIFESTED',
      },
       {
        voyageId: voyage.id,
        weightKg: 15000,
        contents: 'Machinery',
        destinationPort: portRotterdam.name,
        owner: 'HeavyInd',
        qrCode: 'QR-CA-003',
        loadStatus: 'MANIFESTED',
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
