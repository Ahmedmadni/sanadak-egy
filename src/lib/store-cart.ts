/**
 * Pure cart restoration and validation helpers.
 * Never trust prices, currency, stock or variants persisted by a browser.
 * The current catalog is always the authority for those fields.
 */
export type CartCatalogItem = {
  id: string;
  currency: string;
  stock: number | null;
  variants: unknown;
};

export type RestoredCartLine<T extends CartCatalogItem> = Omit<T, "variants"> & {
  qty: number;
  variant: string | null;
};

export function variantOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const labels = value.map((option) => {
    if (typeof option === "string") return option.trim();
    if (
      option &&
      typeof option === "object" &&
      !Array.isArray(option) &&
      typeof option.label === "string"
    ) {
      return option.label.trim();
    }
    return "";
  });
  return [...new Set(labels.filter(Boolean))];
}

export function isSavedLine(value: unknown): value is {
  id: string;
  qty: number;
  variant: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.id === "string" &&
    line.id.trim().length > 0 &&
    typeof line.qty === "number" &&
    Number.isInteger(line.qty) &&
    line.qty > 0 &&
    line.qty <= 99 &&
    (line.variant === null || typeof line.variant === "string")
  );
}

/**
 * Rehydrate only valid lines against the currently offered catalog.
 * Merge duplicate entries, enforce the per-product inventory cap across
 * variants, and prevent mixed-currency orders from being restored.
 */
export function restoreCart<T extends CartCatalogItem>(
  saved: unknown,
  items: readonly T[],
  maxLines = 50,
): RestoredCartLine<T>[] {
  if (!Array.isArray(saved)) return [];

  const catalog = new Map(items.map((item) => [item.id, item]));
  const restored: RestoredCartLine<T>[] = [];
  const lineIndexes = new Map<string, number>();
  const restoredQuantities = new Map<string, number>();
  let currency: string | null = null;

  for (const raw of saved) {
    if (!isSavedLine(raw)) continue;
    const item = catalog.get(raw.id);
    if (!item || (item.stock !== null && item.stock <= 0)) continue;
    if (currency !== null && item.currency !== currency) continue;

    const validVariants = variantOptions(item.variants);
    if (validVariants.length && (!raw.variant || !validVariants.includes(raw.variant))) {
      continue;
    }

    const variant = validVariants.length ? raw.variant : null;
    const key = `${item.id}::${variant ?? ""}`;
    const existingIndex = lineIndexes.get(key);
    if (existingIndex === undefined && restored.length >= maxLines) continue;

    const itemTotal = restoredQuantities.get(item.id) ?? 0;
    const existingQty = existingIndex === undefined ? 0 : restored[existingIndex].qty;
    const available = Math.max(0, Math.min(99, item.stock ?? 99) - itemTotal);
    const quantity = Math.min(raw.qty, available, 99 - existingQty);
    if (quantity < 1) continue;

    if (existingIndex !== undefined) {
      restored[existingIndex] = {
        ...restored[existingIndex],
        qty: existingQty + quantity,
      };
    } else {
      const { variants: _variants, ...canonicalItem } = item;
      restored.push({ ...canonicalItem, qty: quantity, variant });
      lineIndexes.set(key, restored.length - 1);
      currency = item.currency;
    }
    restoredQuantities.set(item.id, itemTotal + quantity);
  }

  return restored;
}
