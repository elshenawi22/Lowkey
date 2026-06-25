// ============================================================================
// LOWKEY — Routing Middleware: Social Share Meta Tags
//
// Social media crawlers (WhatsApp, Facebook, Twitter/X, Telegram, LinkedIn)
// don't execute JavaScript — they only read the raw HTML response. Since
// this is a client-rendered single-page app, every page would otherwise
// show identical generic meta tags when shared.
//
// This middleware detects known crawler user agents requesting a product
// page, fetches the real product from Supabase, and returns a minimal HTML
// document with correct Open Graph / Twitter Card tags for THAT product.
// Real human visitors are untouched — they pass straight through to the
// normal app (this fetch never blocks or slows down their experience).
// ============================================================================

import { next } from '@vercel/functions';

export const config = {
  matcher: '/product/:path*',
};

// Same public values already used client-side in src/lib/supabase.ts.
// The anon key is meant to be public — read access is open by RLS design.
const SUPABASE_URL = 'https://fbcuwavlzibphkekeqvn.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY3V3YXZsemlicGhrZWtlcXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjE5MDIsImV4cCI6MjA5NzA5NzkwMn0.tGLXp6T9UtUB4a1bgESbW1zDfLiEQVWlR24QoU339TI';

const SITE_URL = 'https://lowkey-egy.com';
const SITE_NAME = 'LOWKEY';
const FALLBACK_IMAGE = `${SITE_URL}/images/hero.jpg`;

// Known social/link-preview crawler signatures.
const CRAWLER_PATTERNS = [
  'facebookexternalhit',
  'WhatsApp',
  'Twitterbot',
  'TelegramBot',
  'LinkedInBot',
  'Slackbot',
  'Discordbot',
  'Pinterest',
  'redditbot',
  'SkypeUriPreview',
  'vkShare',
  'Googlebot',
  'bingbot',
];

function isCrawler(userAgent: string): boolean {
  return CRAWLER_PATTERNS.some((p) => userAgent.toLowerCase().includes(p.toLowerCase()));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteImage(url: string): string {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';

  // Real visitors: zero overhead, straight through to the normal app.
  if (!isCrawler(userAgent)) {
    return next();
  }

  const url = new URL(request.url);
  const slug = url.pathname.replace('/product/', '').replace(/\/$/, '');

  if (!slug) return next();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=name,price,intro,image&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!res.ok) return next();
    const rows = (await res.json()) as { name: string; price: string; intro: string; image: string }[];
    const product = rows[0];
    if (!product) return next();

    const title = `${product.name} — ${SITE_NAME}`;
    const description = product.intro || `${product.name} — ${product.price}, available now at ${SITE_NAME}.`;
    const image = absoluteImage(product.image);
    const pageUrl = `${SITE_URL}${url.pathname}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />

<meta property="og:type" content="product" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:url" content="${escapeHtml(pageUrl)}" />
<meta property="product:price:amount" content="${escapeHtml(product.price.replace(/[^0-9.]/g, ''))}" />
<meta property="product:price:currency" content="EGP" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />

<meta http-equiv="refresh" content="0; url=${escapeHtml(pageUrl)}" />
</head>
<body>
<p>${escapeHtml(title)}</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch {
    // Any failure (network, parsing) — never block the request, just
    // fall through to the normal client-rendered app.
    return next();
  }
}
