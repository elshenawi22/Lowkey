// ============================================================================
// LOWKEY — Wishlist Context
// localStorage persistence. Syncs with Supabase when user is authenticated.
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'lowkey-wishlist';

function loadInitial(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

interface WishlistContextValue {
  slugs: string[];
  count: number;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  add: (slug: string) => void;
  remove: (slug: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>(loadInitial);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch {
      // quota / privacy-mode — silent
    }
  }, [slugs]);

  // Sync with Supabase when user session is available
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const syncWithSupabase = async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;

      // Pull remote wishlist
      const { data } = await supabase!
        .from('wishlists')
        .select('product_slug')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        const remote = data.map((r: { product_slug: string }) => r.product_slug);
        setSlugs(prev => Array.from(new Set([...prev, ...remote])));
      }
    };

    syncWithSupabase().catch(() => {
      // Supabase table may not exist yet — fail silently
    });
  }, []);

  const add = useCallback((slug: string) => {
    setSlugs(prev => prev.includes(slug) ? prev : [...prev, slug]);

    if (!isSupabaseConfigured || !supabase) return;
    supabase!.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase!.from('wishlists').upsert(
        { user_id: user.id, product_slug: slug },
        { onConflict: 'user_id,product_slug' }
      ).then(() => {});
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setSlugs(prev => prev.filter(s => s !== slug));

    if (!isSupabaseConfigured || !supabase) return;
    supabase!.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase!.from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_slug', slug)
        .then(() => {});
    });
  }, []);

  const toggle = useCallback((slug: string) => {
    setSlugs(prev => {
      if (prev.includes(slug)) {
        // Remove from Supabase
        if (isSupabaseConfigured && supabase) {
          supabase!.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase!.from('wishlists')
              .delete()
              .eq('user_id', user.id)
              .eq('product_slug', slug)
              .then(() => {});
          });
        }
        return prev.filter(s => s !== slug);
      } else {
        // Add to Supabase
        if (isSupabaseConfigured && supabase) {
          supabase!.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase!.from('wishlists').upsert(
              { user_id: user.id, product_slug: slug },
              { onConflict: 'user_id,product_slug' }
            ).then(() => {});
          });
        }
        return [...prev, slug];
      }
    });
  }, []);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  return (
    <WishlistContext.Provider
      value={{ slugs, count: slugs.length, has, toggle, add, remove }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
