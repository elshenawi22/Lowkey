// ============================================================================
// LOWKEY — Meta Tag Utilities
// Sets per-page description and canonical for SPA routes
// ============================================================================

export function setPageMeta(description: string, canonicalPath: string) {
  // Description
  let descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!descEl) {
    descEl = document.createElement('meta');
    descEl.name = 'description';
    document.head.appendChild(descEl);
  }
  descEl.content = description;

  // Canonical
  let canonEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonEl) {
    canonEl = document.createElement('link');
    canonEl.rel = 'canonical';
    document.head.appendChild(canonEl);
  }
  canonEl.href = `https://lowkey-egy.com${canonicalPath}`;
}

export function resetPageMeta() {
  const descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (descEl) descEl.content = 'LOWKEY — A modern heritage fashion label. Crafted garments inspired by heritage, designed for permanence. Stay Low. Leave Legacy.';
  const canonEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (canonEl) canonEl.href = 'https://lowkey-egy.com/';
}
