// ============================================================================
// LOWKEY — Analytics
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// خطوة 1: Google Analytics GA4
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. افتح analytics.google.com
// 2. اضغط Admin (أسفل يسار) ← Property ← Data Streams ← اختار الـ Stream
// 3. انسخ الـ "Measurement ID" — شكله G-XXXXXXXXXX
// 4. الصقه في السطر التالي بين الـ quotes:
//
const GA_ID = ''; // 👈 مثال: 'G-AB12CD34EF'
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// خطوة 2: Meta Pixel (Facebook / Instagram Ads)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. افتح business.facebook.com ← Events Manager
// 2. اضغط "+ Connect Data Sources" ← Web ← Facebook Pixel
// 3. انسخ الـ "Pixel ID" — رقم من 15-16 خانة
// 4. الصقه في السطر التالي:
//
const FB_PIXEL_ID = ''; // 👈 مثال: '1234567890123456'
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// للتأكد إن كل حاجة شغالة بعد ما تضيف الـ IDs:
// • GA4: افتح analytics.google.com ← Reports ← Realtime — هتشوف نفسك
// • Meta: افتح Events Manager ← Test Events ← افتح الموقع
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ============================================================================

// Initialize trackers — called once on app load from main.tsx
export function initAnalytics() {
  // ── Google Analytics 4 ──────────────────────────────────────────────────
  if (GA_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { send_page_view: true });
  }

  // ── Meta Pixel ────────────────────────────────────────────────────────────
  if (FB_PIXEL_ID) {
    const s = document.createElement('script');
    s.text = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${FB_PIXEL_ID}');fbq('track','PageView');`;
    document.head.appendChild(s);
  }

  // Dev mode: log to console when no IDs are set
  if (!GA_ID && !FB_PIXEL_ID) {
    console.info('[LOWKEY Analytics] Running in dev mode — no IDs configured. Add GA_ID and FB_PIXEL_ID in analytics.ts to activate tracking.');
  }
}

// ── Core event dispatcher ──────────────────────────────────────────────────
function trackEvent(name: string, params?: Record<string, any>) {
  // GA4
  if (GA_ID && (window as any).gtag) {
    (window as any).gtag('event', name, params);
  }
  // Meta Pixel — map standard e-commerce events
  if (FB_PIXEL_ID && (window as any).fbq) {
    const metaEvent =
      name === 'ViewContent' ? 'ViewContent' :
      name === 'AddToCart'   ? 'AddToCart' :
      name === 'InitiateCheckout' ? 'InitiateCheckout' :
      name === 'Purchase'    ? 'Purchase' :
      name === 'Subscribe'   ? 'Subscribe' : null;
    if (metaEvent) (window as any).fbq('track', metaEvent, params);
  }
  // Dev fallback
  if (!GA_ID && !FB_PIXEL_ID) {
    console.log(`[Analytics] ${name}`, params ?? '');
  }
}

// ── Pre-built LOWKEY events ────────────────────────────────────────────────
export const track = {
  // Fired when a product page opens
  viewProduct: (name: string, price: number) =>
    trackEvent('ViewContent', { content_name: name, value: price, currency: 'EGP', content_type: 'product' }),

  // Fired when "Add to Bag" is tapped successfully
  addToCart: (name: string, price: number, size: string) =>
    trackEvent('AddToCart', { content_name: name, value: price, currency: 'EGP', content_category: size }),

  // Fired when the checkout drawer opens
  beginCheckout: (total: number) =>
    trackEvent('InitiateCheckout', { value: total, currency: 'EGP' }),

  // Fired after order is confirmed and saved to Supabase
  purchase: (orderId: string, total: number) =>
    trackEvent('Purchase', { transaction_id: orderId, value: total, currency: 'EGP' }),

  // Fired when newsletter / launch page email is submitted
  subscribe: (source: string) =>
    trackEvent('Subscribe', { source }),
};
