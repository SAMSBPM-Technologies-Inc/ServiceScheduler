import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

describe('Multi-tenancy: Vendor isolation', () => {
  let vendorAId: string;
  let vendorBId: string;
  let productAId: string;

  beforeAll(async () => {
    // Create two vendors
    const [vA, vB] = await Promise.all([
      prisma.vendor.create({ data: { name: 'Vendor A', slug: `test-vendor-a-${Date.now()}`, email: `a${Date.now()}@test.com`, passwordHash: 'x' } }),
      prisma.vendor.create({ data: { name: 'Vendor B', slug: `test-vendor-b-${Date.now()}`, email: `b${Date.now()}@test.com`, passwordHash: 'x' } }),
    ]);
    vendorAId = vA.id;
    vendorBId = vB.id;

    const product = await prisma.product.create({ data: { vendorId: vendorAId, code: 'TPROD', name: 'Test Product', category: 'Test', price: 0 } });
    productAId = product.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { vendorId: { in: [vendorAId, vendorBId] } } });
    await prisma.vendor.deleteMany({ where: { id: { in: [vendorAId, vendorBId] } } });
    await prisma.$disconnect();
  });

  it('Vendor B cannot read Vendor A products when vendorId filter is applied', async () => {
    const products = await prisma.product.findMany({ where: { vendorId: vendorBId } });
    const vendorAProduct = products.find((p) => p.id === productAId);
    expect(vendorAProduct).toBeUndefined();
  });

  it('Vendor A can read their own products', async () => {
    const products = await prisma.product.findMany({ where: { vendorId: vendorAId } });
    const found = products.find((p) => p.id === productAId);
    expect(found).toBeDefined();
  });

  it('Direct ID lookup with wrong vendorId returns null', async () => {
    const product = await prisma.product.findFirst({ where: { id: productAId, vendorId: vendorBId } });
    expect(product).toBeNull();
  });
});
