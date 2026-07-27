// ============================================================================
// LOWKEY — Orders Service
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { Order } from './database.types';

const STORAGE_KEY = 'lowkey-orders';
const ERRORS_KEY = 'lowkey-order-errors';

// Sequential ID — stored in Supabase so it persists across devices
async function generateId(): Promise<string> {
  // Try Supabase counter first
  if (isSupabaseConfigured && supabase) {
    try {
      // Get max order number from existing orders
      const { data } = await supabase.from('orders').select('id').order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        const lastId = data[0].id;
        const lastNum = parseInt(lastId.replace('LK-', '')) || 999;
        return `LK-${lastNum + 1}`;
      }
      return 'LK-1000'; // First order
    } catch { /* fall through */ }
  }
  
  // Fallback: localStorage counter
  const key = 'lowkey-order-counter';
  let counter = parseInt(localStorage.getItem(key) || '999', 10);
  counter++;
  localStorage.setItem(key, counter.toString());
  return `LK-${counter}`;
}

function logError(orderId: string, error: string) {
  try {
    const errors = JSON.parse(localStorage.getItem(ERRORS_KEY) || '[]');
    errors.unshift({ orderId, error, time: new Date().toISOString() });
    localStorage.setItem(ERRORS_KEY, JSON.stringify(errors.slice(0, 20)));
  } catch { /* */ }
}

export function getOrderErrors(): { orderId: string; error: string; time: string }[] {
  try { return JSON.parse(localStorage.getItem(ERRORS_KEY) || '[]'); } catch { return []; }
}

export async function createOrder(order: Omit<Order, 'id' | 'status'>): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const orderId = await generateId();
  const fullOrder: Order = { ...order, id: orderId, status: 'pending' };

  // Save to localStorage
  try {
    const list: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    list.push(fullOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* */ }

  // Save to Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const safeItems = (order.items || []).map(i => ({
        slug: String(i.slug || ''),
        name: String(i.name || ''),
        size: String(i.size || ''),
        qty: Number(i.qty) || 0,
        price: Number(i.price) || 0,
      }));

      const res = await supabase.from('orders').insert({
        id: orderId,
        customer_name: String(order.customerName || ''),
        customer_email: String(order.customerEmail || ''),
        customer_phone: String(order.customerPhone || ''),
        customer_address: String(order.customerAddress || ''),
        items: safeItems,
        subtotal: Math.round(Number(order.subtotal) || 0),
        status: 'pending',
        notes: order.notes ? String(order.notes) : null,
      });

      if (res.error) {
        logError(orderId, `${res.error.message} [${res.error.code}] ${res.error.details || ''}`);
      } else {
        // Supabase OK — remove from localStorage
        try {
          const list: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter(o => o.id !== orderId)));
        } catch { /* */ }
      }
    } catch (e: any) {
      logError(orderId, e?.message || String(e));
    }
  }

  return { success: true, orderId };
}

export async function getOrders(): Promise<(Order & { createdAt?: string })[]> {
  const all: (Order & { createdAt?: string })[] = [];
  const ids = new Set<string>();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (data) data.forEach((r: any) => {
        ids.add(r.id);
        all.push({
          id: r.id, customerName: r.customer_name, customerEmail: r.customer_email,
          customerPhone: r.customer_phone, customerAddress: r.customer_address,
          items: r.items || [], subtotal: r.subtotal, status: r.status,
          notes: r.notes || undefined, createdAt: r.created_at,
        });
      });
    } catch { /* */ }
  }

  try {
    const local: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    local.forEach(o => { if (o.id && !ids.has(o.id)) all.push({ ...o, createdAt: undefined }); });
  } catch { /* */ }

  return all;
}

export async function syncLocalOrdersToSupabase(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;
  try {
    const local: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (local.length === 0) return 0;
    let synced = 0;
    for (const order of local) {
      try {
        const safeItems = (order.items || []).map(i => ({
          slug: String(i.slug || ''), name: String(i.name || ''),
          size: String(i.size || ''), qty: Number(i.qty) || 0, price: Number(i.price) || 0,
        }));
        const { error } = await supabase.from('orders').insert({
          id: order.id, customer_name: String(order.customerName || ''),
          customer_email: String(order.customerEmail || ''), customer_phone: String(order.customerPhone || ''),
          customer_address: String(order.customerAddress || ''), items: safeItems,
          subtotal: Math.round(Number(order.subtotal) || 0), status: order.status || 'pending',
          notes: order.notes || null,
        });
        if (!error || error.code === '23505') synced++;
      } catch { /* */ }
    }
    if (synced > 0) localStorage.setItem(STORAGE_KEY, '[]');
    return synced;
  } catch { return 0; }
}
