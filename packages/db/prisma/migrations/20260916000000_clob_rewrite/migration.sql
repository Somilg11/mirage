-- CLOB rewrite: replaces JSON order books with Order/Trade tables, turns
-- OrderHistory into an Activity ledger, and adds market metadata.
-- Written to preserve existing rows (users, markets, positions, history).

-- Enums --------------------------------------------------------------------
ALTER TYPE "PositionType" RENAME TO "Outcome";

CREATE TYPE "OrderSide" AS ENUM ('Buy', 'Sell');
CREATE TYPE "BookSide" AS ENUM ('Bid', 'Ask');
CREATE TYPE "OrderStatus" AS ENUM ('Open', 'Filled', 'Cancelled');
CREATE TYPE "TimeInForce" AS ENUM ('GTC', 'IOC');
CREATE TYPE "MarketStatus" AS ENUM ('Open', 'Resolved');
CREATE TYPE "ActivityType" AS ENUM ('Claim', 'Buy', 'Sell', 'Split', 'Merge', 'Payout');

-- User ---------------------------------------------------------------------
DROP INDEX "User_address_idx";
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Market -------------------------------------------------------------------
ALTER TABLE "Market" RENAME COLUMN "resolutionDescription" TO "rules";
ALTER TABLE "Market"
  DROP COLUMN "yesOrderBook",
  DROP COLUMN "noOrderBook",
  DROP COLUMN "totalQty",
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "status" "MarketStatus" NOT NULL DEFAULT 'Open',
  ADD COLUMN "endDate" TIMESTAMP(3),
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "volume" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastPrice" INTEGER,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Market" SET
  "slug" = "id",
  "endDate" = CURRENT_TIMESTAMP + INTERVAL '90 days',
  "rules" = CASE WHEN "rules" = '' THEN "description" ELSE "rules" END,
  "status" = CASE WHEN "resolution" IS NULL THEN 'Open'::"MarketStatus" ELSE 'Resolved'::"MarketStatus" END,
  "resolvedAt" = CASE WHEN "resolution" IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END;

ALTER TABLE "Market"
  ALTER COLUMN "slug" SET NOT NULL,
  ALTER COLUMN "endDate" SET NOT NULL,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE UNIQUE INDEX "Market_slug_key" ON "Market"("slug");
CREATE INDEX "Market_status_endDate_idx" ON "Market"("status", "endDate");
CREATE INDEX "Market_category_idx" ON "Market"("category");

-- Position -----------------------------------------------------------------
ALTER TABLE "Position" RENAME COLUMN "type" TO "outcome";
ALTER INDEX "Position_userId_marketId_type_key" RENAME TO "Position_userId_marketId_outcome_key";
ALTER TABLE "Position"
  ADD COLUMN "lockedQty" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "costBasis" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Position_marketId_idx" ON "Position"("marketId");

-- OrderHistory -> Activity -------------------------------------------------
ALTER TABLE "OrderHistory" RENAME TO "Activity";
ALTER TABLE "Activity" RENAME CONSTRAINT "OrderHistory_pkey" TO "Activity_pkey";
ALTER TABLE "Activity" DROP CONSTRAINT "OrderHistory_userId_fkey";
ALTER TABLE "Activity" DROP CONSTRAINT "OrderHistory_marketId_fkey";

ALTER TABLE "Activity" RENAME COLUMN "qty" TO "quantity";
ALTER TABLE "Activity"
  ALTER COLUMN "orderType" TYPE "ActivityType" USING ("orderType"::text::"ActivityType"),
  ALTER COLUMN "quantity" DROP NOT NULL,
  ALTER COLUMN "price" DROP NOT NULL,
  ALTER COLUMN "marketId" DROP NOT NULL,
  ADD COLUMN "outcome" "Outcome",
  ADD COLUMN "amount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Activity" RENAME COLUMN "orderType" TO "type";

UPDATE "Activity" SET
  "amount" = CASE "type"
    WHEN 'Buy' THEN -("price" * "quantity")
    WHEN 'Sell' THEN "price" * "quantity"
    WHEN 'Split' THEN -(100 * "quantity")
    WHEN 'Merge' THEN 100 * "quantity"
    ELSE 0
  END,
  "price" = CASE WHEN "type" IN ('Split', 'Merge') THEN NULL ELSE "price" END;

DROP TYPE "OrderType";

CREATE INDEX "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Order --------------------------------------------------------------------
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcome" "Outcome" NOT NULL,
    "side" "OrderSide" NOT NULL,
    "bookSide" "BookSide" NOT NULL,
    "price" INTEGER NOT NULL,
    "yesPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "filledQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'Open',
    "timeInForce" "TimeInForce" NOT NULL DEFAULT 'GTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Order_marketId_status_bookSide_yesPrice_createdAt_idx" ON "Order"("marketId", "status", "bookSide", "yesPrice", "createdAt");
CREATE INDEX "Order_userId_status_createdAt_idx" ON "Order"("userId", "status", "createdAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trade --------------------------------------------------------------------
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "makerOrderId" TEXT NOT NULL,
    "takerOrderId" TEXT NOT NULL,
    "yesPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "takerOutcome" "Outcome" NOT NULL,
    "takerSide" "OrderSide" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Trade_marketId_createdAt_idx" ON "Trade"("marketId", "createdAt");
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_makerOrderId_fkey" FOREIGN KEY ("makerOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_takerOrderId_fkey" FOREIGN KEY ("takerOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
