// ============================================================================
// LOWKEY — Inventory Management
// Auto-decrement on order. Supabase first, localStorage fallback.
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export interface StockItem {
  productSlug: string;
  size: string;
  quantity: number;
}

const STORAGE_KEY = 'lowkey-inventory';

export async function loadInventory(): Promise<StockItem[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.from('inventory').select('*');
      if (data && data.length > 0) {
        const items = data.map((r: any) => ({ productSlug: r.product_slug, size: r.size, quantity: r.quantity }));
        // Cache locally
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return items;
      }
    } catch { /* fallback */ }
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export async function getProductStock(slug: string): Promise<Record<string, number>> {
  const all = await loadInventory();
  const stock: Record<string, number> = {};
  all.filter(i => i.productSlug === slug).forEach(i => { stock[i.size] = i.quantity; });
  return stock;
}

export async function updateStock(slug: string, size: string, quantity: number): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('inventory')
      .upsert({ product_slug: slug, size, quantity, updated_at: new Date().toISOString() }, { onConflict: 'product_slug,size' });
    if (!error) {
      // Update local cache
      try {
        const all: StockItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const idx = all.findIndex(i => i.productSlug === slug && i.size === size);
        if (idx >= 0) all[idx].quantity = quantity; else all.push({ productSlug: slug, size, quantity });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch { /* */ }
      return true;
    }
  }
  // Fallback
  try {
    const all: StockItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = all.findIndex(i => i.productSlug === slug && i.size === size);
    if (idx >= 0) all[idx].quantity = quantity; else all.push({ productSlug: slug, size, quantity });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch { return false; }
}

export async function decrementStock(items: { slug: string; size: string; qty: number }[]): Promise<void> {
  for (const item of items) {
    const stock = await getProductStock(item.slug);
    const current = stock[item.size] ?? 0;
    const newQty = Math.max(0, current - item.qty);
    await updateStock(item.slug, item.size, newQty);
  }
}
