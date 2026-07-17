-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductCategory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductSubCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_vendorId_name_key" ON "ProductCategory"("vendorId", "name");
CREATE INDEX "ProductCategory_vendorId_idx" ON "ProductCategory"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSubCategory_categoryId_name_key" ON "ProductSubCategory"("categoryId", "name");
CREATE INDEX "ProductSubCategory_categoryId_idx" ON "ProductSubCategory"("categoryId");
