import { PlanType, SelectionRule, ScheduleTier } from '@prisma/client';

interface ProductGroupItem { productId: string; }
interface ProductGroup { id: string; selectionRule: SelectionRule; chooseN?: number | null; items: ProductGroupItem[]; }
interface PlanScheduleTierWithGroups { tier: ScheduleTier; productGroups: ProductGroup[]; }
interface PlanForValidation { planType: PlanType; scheduleTiers: PlanScheduleTierWithGroups[]; }
interface SelectionInput { productGroupId: string; productId: string; }

export interface ValidationResult { valid: boolean; error?: string; }

export function validatePlanSelection(
  plan: PlanForValidation,
  selectedTier: ScheduleTier,
  selections: SelectionInput[]
): ValidationResult {
  if (plan.planType !== 'FIXED') return { valid: false, error: 'Not a fixed plan' };

  const tierData = plan.scheduleTiers.find((t) => t.tier === selectedTier);
  if (!tierData) return { valid: false, error: `Tier ${selectedTier} not available in this plan` };

  for (const group of tierData.productGroups) {
    const groupSelections = selections.filter((s) => s.productGroupId === group.id);
    const validProductIds = group.items.map((i) => i.productId);

    if (group.selectionRule === 'ALL') {
      // No customer choice needed
      continue;
    } else if (group.selectionRule === 'CHOOSE_ONE') {
      if (groupSelections.length !== 1) return { valid: false, error: `Group "${group.id}": must choose exactly 1 item` };
      if (!validProductIds.includes(groupSelections[0].productId)) return { valid: false, error: `Group "${group.id}": selected product not in group` };
    } else if (group.selectionRule === 'CHOOSE_N') {
      const n = group.chooseN ?? 1;
      if (groupSelections.length !== n) return { valid: false, error: `Group "${group.id}": must choose exactly ${n} items` };
      for (const sel of groupSelections) {
        if (!validProductIds.includes(sel.productId)) return { valid: false, error: `Group "${group.id}": selected product not in group` };
      }
    }
  }
  return { valid: true };
}

export function validateConfigurableSubscription(
  allowedProductTiers: { productId: string; allowedTiers: ScheduleTier[] }[],
  taskSchedules: { productId: string; tier: ScheduleTier }[]
): ValidationResult {
  if (taskSchedules.length === 0) return { valid: false, error: 'Must select at least one task' };

  const allowedMap = new Map(allowedProductTiers.map((p) => [p.productId, p.allowedTiers]));

  for (const ts of taskSchedules) {
    const allowed = allowedMap.get(ts.productId);
    if (!allowed) return { valid: false, error: `Product ${ts.productId} not in plan` };
    if (!allowed.includes(ts.tier)) return { valid: false, error: `Tier ${ts.tier} not allowed for product ${ts.productId}` };
  }
  return { valid: true };
}
