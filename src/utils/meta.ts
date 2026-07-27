// ============================================================================
// LOWKEY — Meta Tag Utilities
// Per-page title, description, canonical, OG, Twitter Card, JSON-LD
// ============================================================================

const BASE_URL = 'https://lowkey-egy.com';
const DEFAULT_TITLE = 'LOWKEY — Stay Low. Leave Legacy.';
const DEFAULT_DESC = 'LOWKEY — A modern heritage fashion label. Crafted garments inspired by heritage, designed for permanence. Stay Low. Leave Legacy.';
const DEFAULT_IMAGE = `${BASE_URL}/images/hero.jpg`;

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

function setOG(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
  el.content = content;
}

function setCanonical(path: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = `${BASE_URL}${path}`;
}

export interface PageMetaOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  price?: number;
  currency?: string;
  inStock?: boolean;
}

export function setPageMeta(descriptionOrOptions: string | PageMetaOptions, canonicalPath?: string) {
  let opts: PageMetaOptions;
  if (typeof descriptionOrOptions === 'string') {
    opts = { description: descriptionOrOptions, canonicalPath };
  } else {
    opts = descriptionOrOptions;
  }

  const title = opts.title || DEFAULT_TITLE;
  const desc = opts.description || DEFAULT_DESC;
  const path = opts.canonicalPath || '/';
  const image = opts.image || DEFAULT_IMAGE;

  // Title
  document.title = title;

  // Basic meta
  setMeta('description', desc);
  setMeta('robots', 'index, follow');

  // OG
  setOG('og:title', title);
  setOG('og:description', desc);
  setOG('og:image', image);
  setOG('og:url', `${BASE_URL}${path}`);
  setOG('og:type', opts.type === 'product' ? 'og:product' : 'website');
  setOG('og:site_name', 'LOWKEY');
  setOG('og:locale', 'ar_EG');

  // Twitter
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', desc);
  setMeta('twitter:image', image);

  // Product-specific meta
  if (opts.type === 'product' && opts.price !== undefined) {
    setMeta('product:price:amount', String(opts.price));
    setMeta('product:price:currency', opts.currency || 'EGP');
    setOG('product:availability', opts.inStock !== false ? 'in stock' : 'out of stock');
  }

  // Canonical
  setCanonical(path);
}

export function resetPageMeta() {
  setPageMeta({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    canonicalPath: '/',
    image: DEFAULT_IMAGE,
  });
}

// Preload an image as a priority hint for LCP
export function preloadImage(src: string) {
  if (!src || document.querySelector(`link[rel="preload"][href="${src}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
}
