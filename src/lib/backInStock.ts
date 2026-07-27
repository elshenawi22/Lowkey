// ============================================================================
// LOWKEY — Back In Stock
// Stores subscriptions in Supabase `back_in_stock` table (if configured)
// and localStorage as a fallback. Admin can query the table directly.
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export interface BackInStockSubscription {
  product_slug: string;
  size: string;
  email: string;
  whatsapp?: string;
  created_at: string;
}

const STORAGE_KEY = 'lowkey-back-in-stock';

function loadLocal(): BackInStockSubscription[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(subs: BackInStockSubscription[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  } catch {
    // silent
  }
}

export async function subscribeBackInStock(
  productSlug: string,
  size: string,
  email: string,
  whatsapp?: string
): Promise<{ success: boolean; error?: string }> {
  const entry: BackInStockSubscription = {
    product_slug: productSlug,
    size,
    email: email.trim().toLowerCase(),
    whatsapp: whatsapp?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  // Persist locally first — works even without Supabase
  const local = loadLocal();
  const alreadyExists = local.some(
    s => s.product_slug === productSlug && s.size === size && s.email === entry.email
  );
  if (!alreadyExists) {
    saveLocal([...local, entry]);
  }

  // Attempt Supabase write
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('back_in_stock').upsert(
        {
          product_slug: productSlug,
          size,
          email: entry.email,
          whatsapp: entry.whatsapp ?? null,
          created_at: entry.created_at,
        },
        { onConflict: 'product_slug,size,email' }
      );
      if (error) {
        // Table may not exist yet — fail gracefully
        return { success: true }; // localStorage saved — still useful
      }
    } catch {
      return { success: true }; // localStorage saved
    }
  }

  return { success: true };
}

export function getLocalSubscriptions(): BackInStockSubscription[] {
  return loadLocal();
}

export async function getAdminSubscriptions(): Promise<BackInStockSubscription[]> {
  if (!isSupabaseConfigured || !supabase) return loadLocal();

  try {
    const { data } = await supabase
      .from('back_in_stock')
      .select('*')
      .order('created_at', { ascending: false });

    return (data as BackInStockSubscription[]) ?? loadLocal();
  } catch {
    return loadLocal();
  }
}
