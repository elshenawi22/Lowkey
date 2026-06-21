// ============================================================================
// LOWKEY — Bag Context
// Lightweight client-side selection state ("Add to Archive") with localStorage
// persistence. The "bag" is framed as "Your Selection" to stay on-brand.
// Checkout is intentionally a refined expression of intent, not a live gateway.
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { getProduct, type Product } from '../data/catalog';

export interface BagItem {
  slug: string;
  size: string;
  qty: number;
}

interface BagContextValue {
  items: BagItem[];
  isOpen: boolean;
  count: number;
  subtotal: number;
  open: () => void;
  close: () => void;
  add: (slug: string, size: string, qty?: number) => void;
  remove: (slug: string, size: string) => void;
  updateQty: (slug: string, size: string, qty: number) => void;
  clear: () => void;
}

const BagContext = createContext<BagContextValue | null>(null);
const STORAGE_KEY = 'lowkey-selection';

function loadInitial(): BagItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BagItem[]) : [];
  } catch {
    return [];
  }
}

export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>(loadInitial);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota / privacy-mode errors gracefully.
    }
  }, [items]);

  const add = useCallback((slug: string, size: string, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.slug === slug && i.size === size);
      if (existing) {
        return prev.map((i) =>
          i.slug === slug && i.size === size
            ? { ...i, qty: i.qty + qty }
            : i
        );
      }
      return [...prev, { slug, size, qty }];
    });
    setIsOpen(true);
  }, []);

  const remove = useCallback((slug: string, size: string) => {
    setItems((prev) => prev.filter((i) => !(i.slug === slug && i.size === size)));
  }, []);

  const updateQty = useCallback((slug: string, size: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.slug === slug && i.size === size ? { ...i, qty: Math.max(1, qty) } : i
        )
        .filter((i) => i.qty > 0)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => {
    const p: Product | undefined = getProduct(i.slug);
    return sum + (p ? p.priceValue * i.qty : 0);
  }, 0);

  return (
    <BagContext.Provider
      value={{ items, isOpen, count, subtotal, open, close, add, remove, updateQty, clear }}
    >
      {children}
    </BagContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBag() {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error('useBag must be used within BagProvider');
  return ctx;
}
