-- CreateTable
CREATE TABLE "Vessel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'AT_PORT',

    CONSTRAINT "Vessel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voyage" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT NOT NULL,
    "originPort" TEXT NOT NULL,
    "destinationPort" TEXT NOT NULL,
    "departureTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "runningCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "runningCostCents" INTEGER NOT NULL DEFAULT 0,
    "lastTickAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costConfigId" TEXT,

    CONSTRAINT "Voyage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoyageCostConfig" (
    "id" TEXT NOT NULL,
    "fuelPriceUsdPerTon" DOUBLE PRECISION NOT NULL,
    "fuelConsumptionTph" DOUBLE PRECISION NOT NULL,
    "portFeesUsd" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VoyageCostConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoItem" (
    "id" TEXT NOT NULL,
    "voyageId" TEXT,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "contents" TEXT NOT NULL,
    "destinationPort" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "loadStatus" TEXT NOT NULL DEFAULT 'MANIFESTED',
    "cargoId" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "lengthM" DOUBLE PRECISION NOT NULL DEFAULT 6.1,
    "widthM" DOUBLE PRECISION NOT NULL DEFAULT 2.4,
    "heightM" DOUBLE PRECISION NOT NULL DEFAULT 2.6,
    "hazardClass" TEXT NOT NULL DEFAULT 'NONE',
    "deckSlotId" TEXT,
    "notes" TEXT,

    CONSTRAINT "CargoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewMember" (
    "id" TEXT NOT NULL,
    "vesselId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentZone" TEXT,
    "shiftStart" TIMESTAMP(3),

    CONSTRAINT "CrewMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftLog" (
    "id" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),

    CONSTRAINT "ShiftLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortDirectory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "fuelPriceUsdPerTon" DOUBLE PRECISION NOT NULL,
    "portFeesUsd" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PortDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsCache" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "NewsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CargoItem_qrCode_key" ON "CargoItem"("qrCode");

-- CreateIndex
CREATE INDEX "ShiftLog_crewId_idx" ON "ShiftLog"("crewId");

-- CreateIndex
CREATE UNIQUE INDEX "PortDirectory_name_key" ON "PortDirectory"("name");

-- AddForeignKey
ALTER TABLE "Voyage" ADD CONSTRAINT "Voyage_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voyage" ADD CONSTRAINT "Voyage_costConfigId_fkey" FOREIGN KEY ("costConfigId") REFERENCES "VoyageCostConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoItem" ADD CONSTRAINT "CargoItem_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "Voyage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftLog" ADD CONSTRAINT "ShiftLog_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
