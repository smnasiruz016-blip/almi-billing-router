-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "forwardUrl" TEXT NOT NULL,
    "forwardSecret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRoute" (
    "priceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingRoute_pkey" PRIMARY KEY ("priceId")
);

-- CreateTable
CREATE TABLE "RoutedEvent" (
    "eventId" TEXT NOT NULL,
    "productId" TEXT,
    "priceId" TEXT,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "forwardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutedEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "UnroutedEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceId" TEXT,
    "productTag" TEXT,
    "reason" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UnroutedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingRoute_productId_idx" ON "BillingRoute"("productId");

-- CreateIndex
CREATE INDEX "RoutedEvent_status_idx" ON "RoutedEvent"("status");

-- CreateIndex
CREATE INDEX "UnroutedEvent_resolved_idx" ON "UnroutedEvent"("resolved");

-- CreateIndex
CREATE INDEX "UnroutedEvent_eventId_idx" ON "UnroutedEvent"("eventId");

-- AddForeignKey
ALTER TABLE "BillingRoute" ADD CONSTRAINT "BillingRoute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

