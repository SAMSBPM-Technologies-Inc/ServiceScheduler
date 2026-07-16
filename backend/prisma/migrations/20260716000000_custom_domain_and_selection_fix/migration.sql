-- Add customDomain to Vendor
ALTER TABLE "Vendor" ADD COLUMN "customDomain" TEXT;
CREATE UNIQUE INDEX "Vendor_customDomain_key" ON "Vendor"("customDomain");

-- Fix SubscriptionSelection unique constraint: drop old 2-column index, add 3-column index
DROP INDEX IF EXISTS "SubscriptionSelection_subscriptionId_productGroupId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionSelection_subscriptionId_productGroupId_productId_key" ON "SubscriptionSelection"("subscriptionId", "productGroupId", "productId");
