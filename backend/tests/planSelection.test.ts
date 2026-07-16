import { validatePlanSelection, validateConfigurableSubscription } from '../src/services/planSelection';

describe('validatePlanSelection (FIXED plans)', () => {
  const mockPlan: any = {
    planType: 'FIXED',
    scheduleTiers: [{
      tier: 'DAILY',
      productGroups: [
        { id: 'group-all', selectionRule: 'ALL', chooseN: null, items: [{ productId: 'p1' }] },
        { id: 'group-choose-one', selectionRule: 'CHOOSE_ONE', chooseN: null, items: [{ productId: 'p2a' }, { productId: 'p2b' }] },
        { id: 'group-choose-n', selectionRule: 'CHOOSE_N', chooseN: 2, items: [{ productId: 'p3a' }, { productId: 'p3b' }, { productId: 'p3c' }] },
      ],
    }],
  };

  it('passes with valid CHOOSE_ONE selection', () => {
    const result = validatePlanSelection(mockPlan, 'DAILY', [
      { productGroupId: 'group-choose-one', productId: 'p2a' },
      { productGroupId: 'group-choose-n', productId: 'p3a' },
      { productGroupId: 'group-choose-n', productId: 'p3b' },
    ]);
    expect(result.valid).toBe(true);
  });

  it('fails when CHOOSE_ONE has 0 selections', () => {
    const result = validatePlanSelection(mockPlan, 'DAILY', [
      { productGroupId: 'group-choose-n', productId: 'p3a' },
      { productGroupId: 'group-choose-n', productId: 'p3b' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/choose exactly 1/);
  });

  it('fails when CHOOSE_ONE selects a product not in group', () => {
    const result = validatePlanSelection(mockPlan, 'DAILY', [
      { productGroupId: 'group-choose-one', productId: 'INVALID' },
      { productGroupId: 'group-choose-n', productId: 'p3a' },
      { productGroupId: 'group-choose-n', productId: 'p3b' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not in group/);
  });

  it('fails when CHOOSE_N has wrong count', () => {
    const result = validatePlanSelection(mockPlan, 'DAILY', [
      { productGroupId: 'group-choose-one', productId: 'p2a' },
      { productGroupId: 'group-choose-n', productId: 'p3a' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/choose exactly 2/);
  });

  it('fails for invalid tier', () => {
    const result = validatePlanSelection(mockPlan, 'MONTHLY', []);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not available/);
  });
});

describe('validateConfigurableSubscription', () => {
  const allowedProductTiers = [
    { productId: 'vacuum', allowedTiers: ['DAILY' as const, 'WEEKLY' as const] },
    { productId: 'toilet', allowedTiers: ['WEEKLY' as const, 'MONTHLY' as const] },
  ];

  it('passes with valid selections', () => {
    const result = validateConfigurableSubscription(allowedProductTiers, [
      { productId: 'vacuum', tier: 'DAILY' },
      { productId: 'toilet', tier: 'WEEKLY' },
    ]);
    expect(result.valid).toBe(true);
  });

  it('fails with empty task list', () => {
    const result = validateConfigurableSubscription(allowedProductTiers, []);
    expect(result.valid).toBe(false);
  });

  it('fails when product not in plan', () => {
    const result = validateConfigurableSubscription(allowedProductTiers, [{ productId: 'UNKNOWN', tier: 'DAILY' }]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not in plan/);
  });

  it('fails when tier not allowed for product', () => {
    const result = validateConfigurableSubscription(allowedProductTiers, [{ productId: 'toilet', tier: 'DAILY' }]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not allowed/);
  });
});
