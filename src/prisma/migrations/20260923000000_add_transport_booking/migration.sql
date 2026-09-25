-- Create transport pricing table
CREATE TABLE IF NOT EXISTS "TransportPricing" (
    "id" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransportPricing_pkey" PRIMARY KEY ("id")
);

-- Create transport booking table
CREATE TABLE IF NOT EXISTS "TransportBooking" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "fromDestination" TEXT NOT NULL,
    "toDestination" TEXT NOT NULL,
    "travelDate" TIMESTAMP(3) NOT NULL,
    "travelType" TEXT NOT NULL DEFAULT 'one_way',
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "driverName" TEXT,
    "driverPhone" TEXT,
    "carType" TEXT,
    "carColor" TEXT,
    "carNumber" TEXT,
    "rentFee" DOUBLE PRECISION,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransportBooking_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "TransportPricing_vehicleType_key" ON "TransportPricing"("vehicleType");
CREATE INDEX IF NOT EXISTS "TransportBooking_status_idx" ON "TransportBooking"("status");
CREATE INDEX IF NOT EXISTS "TransportBooking_customerPhone_idx" ON "TransportBooking"("customerPhone");
