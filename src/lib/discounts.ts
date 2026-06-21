// ============================================================================
// LOWKEY — Discount Codes
// Reads/writes from Supabase so codes work across every device/browser.
// Falls back to localStorage only if Supabase is unreachable, so the
// checkout flow never hard-fails on a network blip.
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export interface DiscountCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage (0-100) or fixed amount in EGP
  minOrder: number;
  active: boolean;
}

const STORAGE_KEY = 'lowkey-discounts';

const defaults: DiscountCode[] = [
  { code: 'LOWKEY10', type: 'percentage', value: 10, minOrder: 0, active: true },
  { code: 'FIRST500', type: 'fixed', value: 500, minOrder: 3000, active: true },
];

function readLocal(): DiscountCode[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [...defaults];
}

function writeLocal(codes: DiscountCode[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(codes)); } catch { /* ignore */ }
}

function fromRow(row: { code: string; type: string; value: number; min_order: number; active: boolean }): DiscountCode {
  return {
    code: row.code,
    type: row.type as 'percentage' | 'fixed',
    value: Number(row.value),
    minOrder: Number(row.min_order),
    active: row.active,
  };
}

export async function getDiscounts(): Promise<DiscountCode[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('discounts').select('*').order('code');
      if (!error && data) return data.map(fromRow);
    } catch { /* fall through to local */ }
  }
  return readLocal();
}

// Admin: create or update a single code (upsert).
export async function saveDiscount(code: DiscountCode): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('discounts').upsert({
        code: code.code.toUpperCase(),
        type: code.type,
        value: code.value,
        min_order: code.minOrder,
        active: code.active,
      });
      if (!error) return { success: true };
      return { success: false, error: error.message };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }
  // Fallback: localStorage
  const all = readLocal();
  const idx = all.findIndex(c => c.code === code.code);
  if (idx >= 0) all[idx] = code; else all.push(code);
  writeLocal(all);
  return { success: true };
}

export async function deleteDiscount(code: string): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('discounts').delete().eq('code', code);
      if (!error) return { success: true };
      return { success: false, error: error.message };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }
  writeLocal(readLocal().filter(c => c.code !== code));
  return { success: true };
}

export async function validateCode(code: string, subtotal: number): Promise<{ valid: boolean; discount: number; message: string }> {
  const codes = await getDiscounts();
  const found = codes.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);

  if (!found) return { valid: false, discount: 0, message: 'كود غير صالح — Invalid code' };
  if (subtotal < found.minOrder) return { valid: false, discount: 0, message: `الحد الأدنى للطلب EGP ${found.minOrder}` };

  const discount = found.type === 'percentage'
    ? Math.round(subtotal * found.value / 100)
    : found.value;

  return { valid: true, discount, message: found.type === 'percentage' ? `${found.value}% خصم` : `EGP ${found.value} خصم` };
}
