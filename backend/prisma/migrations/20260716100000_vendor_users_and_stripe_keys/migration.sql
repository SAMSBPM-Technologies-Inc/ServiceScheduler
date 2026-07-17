-- Add Stripe keys to Vendor
ALTER TABLE "Vendor" ADD COLUMN "stripeSecretKey" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "stripeWebhookSecret" TEXT;

-- Create VendorUser table for team members (role: ADMIN | WORKER)
CREATE TABLE "VendorUser" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "vendorId"     TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role"         TEXT NOT NULL,
  "active"       BOOLEAN NOT NULL DEFAULT 1,
  "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    DATETIME NOT NULL,
  CONSTRAINT "VendorUser_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VendorUser_email_key" ON "VendorUser"("email");
CREATE INDEX "VendorUser_vendorId_idx" ON "VendorUser"("vendorId");
