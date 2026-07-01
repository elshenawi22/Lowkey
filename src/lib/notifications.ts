// ============================================================================
// LOWKEY — Order Notifications
// Sends order/subscriber notifications via a Supabase Edge Function.
// The Telegram bot token never touches the browser — it lives as a secret
// on the Edge Function only (supabase/functions/notify-order).
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export async function notifyNewOrder(order: {
  id: string;
  name: string;
  phone: string;
  items: { name: string; size: string; qty: number; price: number }[];
  total: number;
  address: string;
  shipping: string;
}) {
  if (!isSupabaseConfigured || !supabase) {
    console.info('[LOWKEY] Supabase not configured — skipping order notification');
    return;
  }

  try {
    // Only the order id is sent — the Edge Function re-reads the order
    // from the database itself, so the client can't forge order details.
    const { error } = await supabase.functions.invoke('notify-order', {
      body: { type: 'order', id: order.id },
    });
    if (error) console.error('[LOWKEY] Order notification failed:', error.message);
  } catch (err) {
    console.error('[LOWKEY] Order notification failed:', err);
  }
}

export async function notifyNewSubscriber(email: string) {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { error } = await supabase.functions.invoke('notify-order', {
      body: { type: 'subscriber', email },
    });
    if (error) console.error('[LOWKEY] Subscriber notification failed:', error.message);
  } catch {
    // Silent fail for subscriber notifications
  }
}
