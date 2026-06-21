// ============================================================================
// LOWKEY — Analytics
// Unified tracking layer for Google Analytics + Meta Pixel
// ============================================================================
//
// لتفعيل Google Analytics:
// 1. اعمل حساب على analytics.google.com
// 2. ضع الـ Measurement ID هنا
//
// لتفعيل Meta Pixel:
// 1. اعمل Pixel من Facebook Business Manager
// 2. ضع الـ Pixel ID هنا
//
// ============================================================================

const GA_ID = ''; // مثال: 'G-XXXXXXXXXX'
const FB_PIXEL_ID = ''; // مثال: '1234567890'

// Initialize trackers
export function initAnalytics() {
  // Google Analytics
  if (GA_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
    
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  // Meta Pixel
  if (FB_PIXEL_ID) {
    const pixelScript = document.createElement('script');
    pixelScript.text = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','${FB_PIXEL_ID}');
      fbq('track','PageView');
    `;
    document.head.appendChild(pixelScript);
  }
}

// Track events
export function trackEvent(name: string, params?: Record<string, any>) {
  // Google Analytics
  if (GA_ID && (window as any).gtag) {
    (window as any).gtag('event', name, params);
  }

  // Meta Pixel
  if (FB_PIXEL_ID && (window as any).fbq) {
    (window as any).fbq('track', name, params);
  }

  // Console log in dev
  if (!GA_ID && !FB_PIXEL_ID) {
    console.log(`[Analytics] ${name}`, params || '');
  }
}

// Pre-built LOWKEY events
export const track = {
  viewProduct: (name: string, price: number) => trackEvent('ViewContent', {
    content_name: name, value: price, currency: 'EGP',
  }),
  addToCart: (name: string, price: number, size: string) => trackEvent('AddToCart', {
    content_name: name, value: price, currency: 'EGP', content_category: size,
  }),
  beginCheckout: (total: number) => trackEvent('InitiateCheckout', {
    value: total, currency: 'EGP',
  }),
  purchase: (orderId: string, total: number) => trackEvent('Purchase', {
    transaction_id: orderId, value: total, currency: 'EGP',
  }),
  subscribe: (source: string) => trackEvent('Subscribe', { source }),
};
