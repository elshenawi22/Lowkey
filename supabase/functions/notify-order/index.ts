// ============================================================================
// LOWKEY — notify-order Edge Function
// Sends Telegram notifications server-side. The bot token NEVER reaches
// the browser — it lives only as a Supabase secret on this function.
//
// Uses the SERVICE ROLE key (not anon) to read the order, because RLS
// restricts order SELECTs to authenticated admins only — customers placing
// an order are anonymous, so this function must read as a trusted server,
// not as the customer's own (unauthenticated) browser session.
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// SUPABASE_SERVICE_ROLE_KEY is auto-provided to every Edge Function by
// Supabase — no need to set it manually as a secret.
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderPayload {
  type: 'order' | 'subscriber';
  // order fields
  id?: string;
  name?: string;
  phone?: string;
  items?: { name: string; size: string; qty: number; price: number }[];
  total?: number;
  address?: string;
  shipping?: string;
  // subscriber field
  email?: string;
}

function escapeMd(s: string): string {
  // Escape Telegram MarkdownV1 special chars to avoid broken formatting / injection
  return String(s).replace(/([_*`[\]])/g, '\\$1');
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram secrets not configured');
    return;
  }
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: OrderPayload = await req.json();

    // ---- Basic shape validation (don't trust the client) ----
    if (!payload || (payload.type !== 'order' && payload.type !== 'subscriber')) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- For orders: verify the order actually exists in the DB ----
    // This stops random requests to this function from spamming your Telegram
    // with fake "orders" that were never written to the database.
    if (payload.type === 'order') {
      if (!payload.id || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: 'Missing order id or server config' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, customer_address, items, subtotal, notes')
        .eq('id', payload.id)
        .single();

      if (error || !order) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const items = (order.items || []) as { name: string; size: string; qty: number; price: number }[];
      const itemsText = items
        .map((i) => `  • ${escapeMd(i.name)} (${escapeMd(i.size)}) × ${i.qty} — EGP ${(i.price * i.qty).toLocaleString()}`)
        .join('\n');

      const message = `🛍️ *طلب جديد — LOWKEY*

*رقم الطلب:* \`${order.id}\`

*العميل:* ${escapeMd(order.customer_name)}
*الموبايل:* ${escapeMd(order.customer_phone)}
*العنوان:* ${escapeMd(order.customer_address)}

*المنتجات:*
${itemsText}

💰 *المجموع: EGP ${Number(order.subtotal).toLocaleString()}*

[📞 اتصل](tel:${order.customer_phone}) | [💬 واتساب](https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')})`;

      await sendTelegram(message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Subscriber notification ----
    if (payload.type === 'subscriber') {
      if (!payload.email) {
        return new Response(JSON.stringify({ error: 'Missing email' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const message = `📧 *مشترك جديد — LOWKEY*\n\n${escapeMd(payload.email)}`;
      await sendTelegram(message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unhandled payload type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('notify-order error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
