// ============================================================================
// LOWKEY — Recently Viewed
// Persists up to 8 product slugs in localStorage.
// Call `trackView(slug)` on every product page mount.
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'lowkey-recently-viewed';
const MAX_ITEMS = 8;

function loadSlugs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveSlugs(slugs: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // silent
  }
}

export function useRecentlyViewed(currentSlug?: string) {
  const [slugs, setSlugs] = useState<string[]>(loadSlugs);

  // Track view when currentSlug changes
  useEffect(() => {
    if (!currentSlug) return;
    setSlugs(prev => {
      const filtered = prev.filter(s => s !== currentSlug);
      const next = [currentSlug, ...filtered].slice(0, MAX_ITEMS);
      saveSlugs(next);
      return next;
    });
  }, [currentSlug]);

  const trackView = useCallback((slug: string) => {
    setSlugs(prev => {
      const filtered = prev.filter(s => s !== slug);
      const next = [slug, ...filtered].slice(0, MAX_ITEMS);
      saveSlugs(next);
      return next;
    });
  }, []);

  // Exclude current product from displayed list
  const displayed = currentSlug ? slugs.filter(s => s !== currentSlug) : slugs;

  return { slugs: displayed, trackView };
}
